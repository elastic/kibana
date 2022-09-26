/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/type-summarizer-core';
import { SourceNode } from 'source-map';

import { ImportedDecs } from '../ast_index';

import { TypeSummaryNamer } from './type_summary_namer';
import { exportSomeName } from './export_some_name';

/**
 * Convert an import request into a usable keyword, for when we don't have much information about a good name for an import
 */
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

/**
 * Reads the imports from the `index` and adds the necessary `SourceNode`s to the `source` for each.
 */
export function printImports(
  imports: ImportedDecs[],
  names: TypeSummaryNamer,
  log: Logger,
  source: SourceNode
) {
  log.step('printImports()', `${imports.length} imports`, () => {
    for (const i of imports) {
      const name = names.get(
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
