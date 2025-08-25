/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import type { Config } from '@jest/types';
import { groupBy, omit, uniq } from 'lodash';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { createConfigHash } from './create_config_hash';

export function groupConfigs({
  globalConfig,
  configs,
  log,
}: {
  globalConfig: Config.GlobalConfig;
  configs: Array<{ configPath: string | null; config: Config.InitialOptions }>;
  log: ToolingLog;
}): Array<Config.InitialOptions> {
  const normalized = configs.map(({ config, configPath }) => {
    const rootDir = config.rootDir || REPO_ROOT;
    const configDir = Path.dirname(configPath!);

    const nextConfig = !globalConfig.collectCoverage
      ? omit(
          config,
          'coverage',
          'collectCoverage',
          'collectCoverageFrom',
          'coverageDirectory',
          'coveragePathIgnorePatterns',
          'coverageProvider',
          'coverageReporters',
          'coverageThreshold'
        )
      : config;

    return {
      configPath,
      config: {
        ...nextConfig,
        rootDir: Path.isAbsolute(rootDir) ? rootDir : Path.join(configDir, rootDir),
      },
    };
  });

  const grouped = groupBy(normalized, (config) => {
    return createConfigHash(config.config);
  });

  log.info(`Folding ${configs.length} configs into ${Object.keys(grouped).length} groups`);

  return Object.values(grouped).map((configsForGroup) => {
    const config = configsForGroup[0].config;
    return {
      ...config,
      roots: uniq(configsForGroup.flatMap((cfg) => cfg.config.roots ?? [])),
    };
  });
}
