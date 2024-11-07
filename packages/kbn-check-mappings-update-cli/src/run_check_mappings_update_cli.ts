/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { runMappingsCompatibilityChecks } from './compatibility';
import { runModelVersionMappingAdditionsChecks } from './mappings_additions';

run(
  async ({ log, flagsReader, addCleanupTask }) => {
    const fix = flagsReader.boolean('fix');
    const verify = flagsReader.boolean('verify');
    const override = flagsReader.boolean('override');
    const task = flagsReader.string('task');

    if (!task || task === 'mapping-addition') {
      log.info('Running model version mapping addition checks');
      await log.indent(4, async () => {
        await runModelVersionMappingAdditionsChecks({ fix, override, verify, log });
      });
    }
    if (!task || task === 'compatibility') {
      log.info('Running mapping compatibility checks');
      await log.indent(4, async () => {
        await runMappingsCompatibilityChecks({ fix, verify, log, addCleanupTask });
      });
    }
  },
  {
    description: `
      Determine if the changes performed to the savedObjects mappings are following our standards
    `,
    flags: {
      boolean: ['fix', 'override', 'verify'],
      string: ['task'],
      default: {
        verify: true,
        mappings: true,
      },
      help: `
        --fix              If the current mappings differ from the mappings in the file, update the current_mappings.json file
        --override              If the current mappings differ from the mappings in the file, update the current_mappings.json file
        --no-verify        Don't run any validation, just update the current_mappings.json file.
        --task             Specify which task(s) to run (compatibility | mapping-addition)
      `,
    },
  }
);
