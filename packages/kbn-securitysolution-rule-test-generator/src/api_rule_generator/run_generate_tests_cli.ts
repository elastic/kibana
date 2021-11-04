/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { REPO_ROOT, createFlagError, run } from '@kbn/dev-utils';
import { promises } from 'fs';
import path from 'path';
import Mustache from 'mustache';

export const TEMPLATE_DIR =
  'x-pack/test/detection_engine_api_integration/security_and_spaces/tests/rules';

export const TEMPLATE_FILE = path.join(REPO_ROOT, TEMPLATE_DIR, 'template.ts');

export const ES_ARCHIVE_DIR = 'x-pack/test/functional/es_archives/generated_rules';

export const ECS_MAPPING_FILE_RELATIVE =
  'x-pack/plugins/security_solution/server/lib/detection_engine/routes/index/ecs_mapping.json';

export const ECS_MAPPING_FILE = path.join(REPO_ROOT, ECS_MAPPING_FILE_RELATIVE);

export const runGenerateTestsCli = () => {
  run(
    async ({ log, flags }) => {
      const { ndjson, rule } = flags;

      if (typeof ndjson !== 'string' || ndjson === '') {
        throw createFlagError('please provide a --ndjson flag');
      }
      if (typeof rule !== 'string' || rule === '') {
        throw createFlagError('please provide a --rule flag');
      }

      const ndjsonFile = await promises.readFile(ndjson, {
        encoding: 'utf8',
        flag: 'r',
      });
      const ndjsonArray = ndjsonFile.split('\n').flatMap((line) => {
        try {
          if (line.trim() !== '') {
            log.info('line is:', line);
            return [JSON.parse(line)];
          } else {
            return [];
          }
        } catch (error) {
          log.error(
            `Could not parse line: ${line}, error: ${error.message}, skipping line (tests might fail)`
          );
          return [];
        }
      });
      log.info('ndjsonFile', ndjsonArray);
      log.info('REPO_ROOT:', REPO_ROOT);
      log.info('Hello there, I am a command line thing with flags:', flags);

      const template = await promises.readFile(TEMPLATE_FILE, {
        encoding: 'utf8',
        flag: 'r',
      });

      const ecsMappingRawFile = await promises.readFile(ECS_MAPPING_FILE, {
        encoding: 'utf8',
        flag: 'r',
      });
      const ecsMappingParsed = JSON.parse(ecsMappingRawFile);
      const mappingToWrite = {
        type: 'index',
        value: {
          index: 'file_name', // <-- TODO need the name here from the JSON rule.
          mappings: ecsMappingParsed.mappings,
          settings: {
            index: {
              number_of_replicas: '1',
              number_of_shards: '1',
            },
          },
        },
      };
      // log.info('ecsMapping', mappingToWrite);
      try {
        await promises.mkdir(path.join(REPO_ROOT, ES_ARCHIVE_DIR, 'file_name')); // <-- TODO need the name here from the JSON rule
      } catch (error) {
        // The directory already exists since it threw
      }

      await promises.writeFile(
        path.join(REPO_ROOT, ES_ARCHIVE_DIR, 'file_name', 'mappings.json'),
        JSON.stringify(mappingToWrite, null, 2)
      );

      const rendered = Mustache.render(template, {
        kqlQuery: true,
      });

      const lines = rendered.split('\n');
      let commentsRemoved = '';
      lines.forEach((line) => {
        // log.info('line:', line);
        if (line.trim() !== '//') {
          commentsRemoved += `${line}\n`;
        }
      });
      // log.info('template is:', template);
      // log.info('rendered is:', rendered);
      // log.info('rendered is:', commentsRemoved);

      await promises.writeFile(path.join(REPO_ROOT, TEMPLATE_DIR, 'file_name.ts'), commentsRemoved);
    },
    {
      description: 'Runs generation of rule tests from events',
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['ndjson', 'rule'],
        help: `
        E.x. node scripts/detection_engine/generate_rule_tests --ndjson ./my_file.ndjson --rule server/lib/detection_engine/rules/prepackaged_rules/command_and_control_telnet_port_activity.json
        --ndjson             Required, location of the ndjson file with the events for the test
        --rule               Required, location of the JSON rule to generate the test from
      `,
      },
    }
  );
};
