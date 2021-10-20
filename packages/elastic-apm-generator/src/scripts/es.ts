/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import { Client } from '@elastic/elasticsearch';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import yargs from 'yargs/yargs';
import { toElasticsearchOutput } from '..';
import { simpleTrace } from './examples/01_simple_trace';

yargs(process.argv.slice(2))
  .command(
    'example',
    'run an example scenario',
    (y) => {
      return y
        .positional('scenario', {
          describe: 'scenario to run',
          choices: ['simple-trace'],
          demandOption: true,
        })
        .option('target', {
          describe: 'elasticsearch target, including username/password',
        })
        .option('from', { describe: 'start of timerange' })
        .option('to', { describe: 'end of timerange' })
        .option('workers', {
          default: 1,
          describe: 'number of concurrently connected ES clients',
        })
        .option('apm-server-version', {
          describe: 'APM Server version override',
        })
        .demandOption('target');
    },
    (argv) => {
      let events: any[] = [];
      const toDateString = (argv.to as string | undefined) || new Date().toISOString();
      const fromDateString =
        (argv.from as string | undefined) ||
        new Date(new Date(toDateString).getTime() - 15 * 60 * 1000).toISOString();

      const to = new Date(toDateString).getTime();
      const from = new Date(fromDateString).getTime();

      switch (argv._[1]) {
        case 'simple-trace':
          events = simpleTrace(from, to);
          break;
      }

      const docs = toElasticsearchOutput(events, argv['apm-server-version'] as string);

      const client = new Client({
        node: argv.target as string,
      });

      const fn = pLimit(argv.workers);

      const batches = chunk(docs, 1000);

      // eslint-disable-next-line no-console
      console.log(
        'Uploading',
        docs.length,
        'docs in',
        batches.length,
        'batches',
        'from',
        fromDateString,
        'to',
        toDateString
      );

      Promise.all(
        batches.map((batch) =>
          fn(() => {
            return client.bulk({
              require_alias: true,
              body: batch.flatMap((doc) => {
                return [{ index: { _index: doc._index } }, doc._source];
              }),
            });
          })
        )
      )
        .then((results) => {
          const errors = results
            .flatMap((result) => result.body.items)
            .filter((item) => !!item.index?.error)
            .map((item) => item.index?.error);

          if (errors.length) {
            // eslint-disable-next-line no-console
            console.error(inspect(errors.slice(0, 10), { depth: null }));
            throw new Error('Failed to upload some items');
          }
          process.exit();
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(err);
          process.exit(1);
        });
    }
  )
  .parse();
