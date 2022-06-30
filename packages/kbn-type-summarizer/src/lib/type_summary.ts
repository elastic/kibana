/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';
import { SourceNode } from 'source-map';

import { Logger } from '@kbn/type-summarizer-core';
import {
  ImportedDecs,
  LocalDecs,
  AstIndexer,
  NamespaceDec,
  NamedExportDetails,
  AmbientRef,
} from './ast_indexer';
import { isTypeDeclaration } from './ts_nodes';
import { SourceMapper } from './source_mapper';

const INVALID_NAMES = ['default', 'import'];

const exportSomeName = ({ name, typeOnly }: NamedExportDetails, localName: string) => {
  return `export ${typeOnly ? `type ` : ''}{${
    name === localName ? name : `${localName} as ${name}`
  }}\n`;
};

const reqToKeyword = (req: string) =>
  req.split(/[A-Z\W]/).reduce((acc, chunk) => {
    if (!chunk) {
      return acc;
    }
    if (acc) {
      return acc + chunk[0].toUpperCase() + chunk.slice(1).toLowerCase();
    }
    return chunk.toLowerCase();
  }, '');

export class TypeSummary {
  private readonly rootDecsSymbols = new Set<ts.Symbol>();
  private readonly usedNames = new Set<string>();
  private readonly namesBySymbol = new Map<ts.Symbol, string>();

  constructor(
    private readonly indexer: AstIndexer,
    private readonly sourceMaps: SourceMapper,
    private readonly log: Logger,
    private readonly locals: LocalDecs[],
    private readonly imports: ImportedDecs[],
    ambientRefs: AmbientRef[]
  ) {
    for (const ref of ambientRefs) {
      this.usedNames.add(ref.name);
      this.namesBySymbol.set(ref.rootSymbol, ref.name);
    }

    for (const l of locals) {
      this.rootDecsSymbols.add(l.rootSymbol);
      if (l.exported?.type === 'named') {
        // assign export name to this root symbol, if possible
        if (this.usedNames.has(l.exported.name)) {
          throw new Error(`multiple exports using the name ${l.exported.name}`);
        }

        this.usedNames.add(l.exported.name);
        this.namesBySymbol.set(l.rootSymbol, l.exported.name);
      }
    }
    for (const i of imports) {
      this.rootDecsSymbols.add(i.rootSymbol);
    }
  }

  private getName(rootSymbol: ts.Symbol, nameFromSource: string) {
    if (!this.rootDecsSymbols.has(rootSymbol)) {
      return nameFromSource;
    }

    const existing = this.namesBySymbol.get(rootSymbol);
    if (existing !== undefined) {
      return existing;
    }

    let counter = 0;
    let name = nameFromSource;
    while (this.usedNames.has(name) || INVALID_NAMES.includes(name)) {
      name = `${nameFromSource}_${++counter}`;
    }

    this.usedNames.add(name);
    this.namesBySymbol.set(rootSymbol, name);
    return name;
  }

  private printImports(source: SourceNode) {
    this.log.step('printImports()', `${this.imports.length} imports`, () => {
      for (const i of this.imports) {
        const name = this.getName(
          i.rootSymbol,
          // if we don't use it locally, don't try to re-use its name
          i.localUsageCount ? i.details.node.name?.getText() ?? reqToKeyword(i.details.req) : '_'
        );

        if (i.details.type === 'default') {
          source.add(`import ${name} from '${i.details.req}'\n`);
          for (const exported of i.exports) {
            if (exported.type === 'default') {
              source.add(`export default ${name}\n`);
            } else {
              source.add(exportSomeName(exported, name));
            }
          }
        } else if (i.details.type === 'namespace') {
          source.add(`import * as ${name} from '${i.details.req}'\n`);
          for (const exported of i.exports) {
            if (exported.type === 'default') {
              source.add(`export default ${name}\n`);
            } else {
              source.add(exportSomeName(exported, name));
            }
          }
        } else {
          const { details, exports, localUsageCount } = i;

          let imported = false;
          const ensureImported = () => {
            if (!imported) {
              imported = true;
              source.add(
                `import { ${
                  details.sourceName !== name ? `${details.sourceName} as ${name}` : name
                } } from '${details.req}'\n`
              );
            }
          };

          if (localUsageCount) {
            ensureImported();
          }

          for (const exported of exports) {
            if (exported.type === 'default') {
              ensureImported();
              source.add(`export default ${name}\n`);
            } else {
              source.add(
                `export ${exported.typeOnly ? `type ` : ''}{ ${
                  exported.name !== details.sourceName
                    ? `${details.sourceName} as ${exported.name}`
                    : details.sourceName
                } } from '${details.req}'\n`
              );
            }
          }
        }
      }

      source.add('\n');
    });
  }

  printLocals(source: SourceNode) {
    this.log.step(
      'printLocals()',
      `${this.locals.reduce((acc, l) => acc + l.size, 0)} decs`,
      () => {
        for (const local of this.locals) {
          this.rootDecsSymbols.add(local.rootSymbol);
        }

        for (const local of this.locals) {
          if (local instanceof NamespaceDec) {
            const name = this.getName(
              local.rootSymbol,
              local.exported?.type === 'named' ? local.exported.name : 'ns'
            );

            /**
             * synthesize the namespace that represents the namespace import
             * Should end up looking like:
             *
             * declare namespace Path {
             *     export {
             *         cwdRelative,
             *         relative,
             *         join,
             *         dirname,
             *         resolve,
             *         isAbsolute,
             *         toNormal
             *     }
             * }
             * export { Path }
             *
             */
            source.add([
              `declare namespace `,
              new SourceNode(1, 0, this.sourceMaps.getOriginalSourcePath(local.sourceFile), name),
              ` {\n`,
            ]);
            source.add(`  export {\n`);
            // members
            for (const [memberName, symbol] of local.members) {
              const refName = this.getName(symbol, memberName);
              source.add(
                `    ${memberName === refName ? memberName : `${refName} as ${memberName}`},\n`
              );
            }
            source.add(`  }\n`);
            source.add(`}\n`);

            if (local.exported?.type === 'named') {
              source.add(exportSomeName(local.exported, name));
            }

            if (local.exported?.type === 'default') {
              source.add(`export default ${name}`);
            }

            continue;
          }

          const decName = this.getName(
            local.rootSymbol,
            local.exported?.type === 'named' ? local.exported.name : local.decs[0].name.getText()
          );
          const exportLocally =
            local.exported?.type === 'named' &&
            (local.decs.every(isTypeDeclaration) || !local.exported.typeOnly) &&
            this.getName(local.rootSymbol, local.exported.name) === local.exported.name;

          for (const dec of local.decs) {
            for (const s of this.indexer.toSnippets(dec)) {
              if (s.type === 'source') {
                source.add(s.value);
                continue;
              }

              if (s.type === 'export') {
                // only print the export if we are exporting locally, otherwise drop this snipped
                if (exportLocally) {
                  if (local.exported?.type === 'default') {
                    source.add(`export default `);
                  } else {
                    source.add(`export `);
                  }
                } else {
                  if (s.noExportRequiresDeclare) {
                    source.add(`declare `);
                  }
                }
                continue;
              }

              const name = this.getName(s.rootSymbol, s.text);
              source.add(
                s.structural ? this.sourceMaps.getSourceNode(s.identifier, name) ?? name : name
              );
            }

            source.add('\n');
          }

          if (!exportLocally) {
            if (local.exported?.type === 'named') {
              source.add(exportSomeName(local.exported, decName));
            }
            if (local.exported?.type === 'default') {
              source.add(`export default ${decName}\n`);
            }
          }

          source.add('\n');
        }
      }
    );
  }

  getSourceNode() {
    const source = new SourceNode();
    this.printImports(source);
    this.printLocals(source);
    return source;
  }
}
