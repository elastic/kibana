/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  castArray,
  chain,
  find,
  flip,
  flow,
  isEmpty,
  map,
  mapValues,
  round,
  startCase,
} from 'lodash';
import { filter as filterBy, mapKeys as mapKeysWith, mapValues as mapValuesWith } from 'lodash/fp';
import { run } from '@kbn/dev-cli-runner';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { ComplexityReportGenerator } from './complexity';
import { Lookup } from './lookup';

export function generateComplexityReport(): Promise<void> {
  return run(
    async ({ log, flags }) => {
      const lookup = new Lookup();
      const complexityReportGenerator = new ComplexityReportGenerator(lookup, { complexity: 1 });
      const reporter = CiStatsReporter.fromEnv(log);

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

      const enitities = [
        ...(isEmpty(filter) && isEmpty(pattern) ? await lookup.lookup() : []),
        ...(!isEmpty(filter) ? await lookup.lookup(filter) : []),
        ...(!isEmpty(pattern) ? [{ name: '', owner: undefined, path: pattern }] : []),
      ];
      const report = await complexityReportGenerator.generate(
        enitities.flatMap(({ path }) => path)
      );
      const table = mapValues(
        report,
        flow(
          mapKeysWith(flip(startCase)),
          mapValuesWith((value) => round(value, 2))
        )
      );

      const metrics = chain(table)
        .omit('')
        .mapValues((row, id) => {
          const pluginTeam = find(enitities, { name: id })?.owner?.[0];
          return map(row, (value, group) => ({ id, group, value, meta: { pluginTeam } }));
        })
        .toArray()
        .flatten()
        .value();

      reporter.metrics(metrics);
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
