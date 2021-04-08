/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

const { run } = require('@kbn/dev-utils');

const { optimize } = require('./optimize-tsconfig/optimize');
const { deoptimize } = require('./optimize-tsconfig/deoptimize');

run(
  ({ log, flags }) => {
    const { revert } = flags;

    if (revert) {
      deoptimize().finally(() => {
        log.info('Reverted Presentation TypeScript optimization changes.');
      });
    } else {
      optimize().finally(() => {
        log.info(
          'Optimized tsconfig.json file(s) in Kibana for Presentation Team development. To undo these changes, run `./scripts/optimize_tsconfig --revert`'
        );
      });
    }
  },
  {
    description: `
      Typescript Configuration Optimizer for the Presentation Team.  Changes will not be registered in git.

      When in doubt, --revert.
    `,
    flags: {
      boolean: ['revert'],
      help: `
        --revert           Revert the optimizations in the Typescript configurations.
      `,
    },
  }
);
