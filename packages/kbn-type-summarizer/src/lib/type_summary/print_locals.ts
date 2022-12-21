/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/type-summarizer-core';
import { SourceNode } from 'source-map';

import { isTypeDeclaration } from '../ts_nodes';
import { LocalDecs } from '../ast_index';
import { SourceMapper } from '../source_mapper';
import { DtsSnipper } from '../dts_snipper';

import { TypeSummaryNamer } from './type_summary_namer';
import { exportSomeName } from './export_some_name';

/**
 * Reads `locals` and adds necessary `SourceNode`s to `source` to reproduce the declarations
 * of each local.
 *
 * Local printing is primarily done using the `DtsSnipper` which reads the original definition
 * of the given declaration from the .d.ts files produced by tsc, then breaks them up into
 * "snippets" (more details in the DtsSnipper class). These snippets are then itterated to either
 * produce SourceNodes or text for the resulting definition.
 *
 * The exception is NamespaceDec locals, which must synthesize an imported namespace either
 * for local usage or for exporting. When a namespace import is used a structure similar to
 * the following will be added to the type summary:
 *
 *   declare namespace NamespaceName {
 *       export {
 *           foo,
 *           bar,
 *           baz,
 *       }
 *   }
 *   export { NamespaceName }
 */
export function printLocals(
  locals: LocalDecs[],
  names: TypeSummaryNamer,
  sourceMaps: SourceMapper,
  snipper: DtsSnipper,
  log: Logger,
  source: SourceNode
) {
  const localDecCount = locals.reduce(
    (acc, l) => acc + (l.type === 'namespace dec' ? 1 : l.decs.length),
    0
  );

  log.step('printLocals()', `${localDecCount} decs`, () => {
    for (const local of locals) {
      if (local.type === 'namespace dec') {
        const name = names.get(
          local.rootSymbol,
          local.exported?.type === 'named' ? local.exported.name : 'ns'
        );

        // synthesize the namespace that represents the namespace import
        source.add([
          `declare namespace `,
          new SourceNode(1, 0, sourceMaps.getOriginalSourcePath(local.sourceFile), name),
          ` {\n`,
        ]);
        source.add(`  export {\n`);
        // members
        for (const [memberName, symbol] of local.members) {
          const refName = names.get(symbol, memberName);
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

      const decName = names.get(
        local.rootSymbol,
        local.exported?.type === 'named' ? local.exported.name : local.decs[0].name.getText()
      );
      const exportLocally =
        local.exported?.type === 'named' &&
        (local.decs.every(isTypeDeclaration) || !local.exported.typeOnly) &&
        decName === local.exported.name;

      for (const dec of local.decs) {
        for (const s of snipper.toSnippets(dec)) {
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

          const name = names.get(s.rootSymbol, s.text);
          source.add(s.structural ? sourceMaps.getSourceNode(s.identifier, name) ?? name : name);
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
  });
}
