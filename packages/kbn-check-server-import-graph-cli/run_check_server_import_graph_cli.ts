/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { checkServerImportGraph } from './src/check_server_import_graph';

run(
  async ({ log, flagsReader }) => {
    const result = await checkServerImportGraph({
      log,
      updateBaseline: flagsReader.boolean('update-baseline'),
    });

    if (!result.passed) {
      throw createFailError(
        'Browser-only node modules are reachable from the Kibana server, or the baseline is stale. See the errors above.'
      );
    }
  },
  {
    usage: 'node scripts/check_server_import_graph [--update-baseline]',
    description:
      'Statically walks the import graph from every server entry point and fails when browser-only node modules ' +
      '(@elastic/eui, react-intl, react-use, redux, ...) become reachable through eager imports.',
    flags: {
      boolean: ['update-baseline'],
      help: `
        --update-baseline  Rewrite baseline.json with the current set of violations
      `,
    },
  }
);
