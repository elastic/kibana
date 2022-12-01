/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { castArray, chain, isEmpty, map, startCase } from 'lodash';
import { filter as filterBy } from 'lodash/fp';
import { run } from '@kbn/dev-cli-runner';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { ComplexityReportGenerator } from './complexity';
import { Lookup } from './lookup';

export function generateComplexityReport(): Promise<void> {
  return run(
    async ({ log, flags }) => {
      const lookup = new Lookup();
      const complexityReportGenerator = new ComplexityReportGenerator({ complexity: 1 });

      const filter = chain(flags)
        .pick('owner', 'package', 'plugin')
        .mapValues(castArray)
        .mapValues(filterBy<string>(Boolean))
        .omitBy(isEmpty)
        .value();
      const pattern = chain(flags)
        .pick('pattern', '_')
        .map(castArray)
        .flatten()
        .filter(Boolean)
        .uniq()
        .value() as string[];

      const table = {} as Record<string, Record<string, number>>;
      const reporter = CiStatsReporter.fromEnv(log);

      for (const { name, owner, path } of [
        ...(isEmpty(filter) && isEmpty(pattern) ? await lookup.lookup() : []),
        ...(!isEmpty(filter) ? await lookup.lookup(filter) : []),
        ...(!isEmpty(pattern) ? [{ name: '', path: pattern }] : []),
      ]) {
        log.debug(`Gathering metrics for '${castArray(path).join("', '")}'.`);
        try {
          const report = await complexityReportGenerator.generate(path);
          const metrics = chain(report)
            .mapKeys((value, key) => startCase(key))
            .mapValues((value) => Math.round(value * 100) / 100)
            .value();

          if (name) {
            reporter.metrics(
              map(metrics, (value, group) => ({
                group,
                value,
                id: name,
                meta: { pluginTeam: owner?.[0] },
              }))
            );
          }

          table[name] = metrics;
        } catch (error) {
          if (['AllFilesIgnoredError', 'NoFilesFoundError'].includes(error.constructor.name)) {
            log.info(`Skipping empty '${castArray(path).join("', '")}'.`);
          } else {
            log.error(error);
          }
        }
      }

      // eslint-disable-next-line no-console
      console.table(table);
    },
    {
      flags: {
        alias: { team: 'owner' },
        string: ['owner', 'plugin', 'package', 'pattern'],
        help: `
          --owner, --team    Filter by team.
          --pattern          Filter by path pattern.
          --package          Filter by package name.
          --plugin           Filter by plugin name.
        `,
      },
      description: 'Generates a complexity report for the code.',
    }
  );
}
