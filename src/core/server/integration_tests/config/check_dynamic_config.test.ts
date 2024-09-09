/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
  request,
} from '@kbn/core-test-helpers-kbn-server';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

describe('PUT /internal/core/_settings', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;

  const loggerName = 'my-test-logger';

  beforeAll(async () => {
    const settings = {
      coreApp: { allowDynamicConfigOverrides: true },
      logging: {
        loggers: [{ name: loggerName, level: 'error', appenders: ['console'] }],
      },
    };
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        kbn: settings,
      },
    });

    esServer = await startES();

    const kbnUtils = await startKibana();
    root = kbnUtils.root;

    // eslint-disable-next-line dot-notation
    root['server'].configService.addDynamicConfigPaths('logging', ['loggers']); // just for the sake of being able to change something easy to test
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  test('should update the log level', async () => {
    const logger = root.logger.get(loggerName);
    expect(logger.isLevelEnabled('info')).toBe(false);
    await request
      .put(root, '/internal/core/_settings')
      .set('Elastic-Api-Version', '1')
      .send({ 'logging.loggers': [{ name: loggerName, level: 'debug', appenders: ['console'] }] })
      .expect(200);
    expect(logger.isLevelEnabled('info')).toBe(true);
  });

  test('should remove the setting', async () => {
    const logger = root.logger.get(loggerName);
    expect(logger.isLevelEnabled('info')).toBe(true); // still true from the previous test
    await request
      .put(root, '/internal/core/_settings')
      .set('Elastic-Api-Version', '1')
      .send({ 'logging.loggers': null })
      .expect(200);
    expect(logger.isLevelEnabled('info')).toBe(false);
  });
});

describe('checking all opted-in dynamic config settings', () => {
  let root: Root;

  beforeAll(async () => {
    const settings = {
      logging: {
        loggers: [{ name: 'root', level: 'info', appenders: ['console'] }],
      },
    };

    set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);

    root = createRootWithCorePlugins(settings, {
      basePath: false,
      cache: false,
      dev: true,
      disableOptimizer: true,
      silent: false,
      dist: false,
      oss: false,
      runExamples: false,
      watch: false,
    });

    await root.preboot();
    await root.setup();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
  });

  function getListOfDynamicConfigPaths(): string[] {
    // eslint-disable-next-line dot-notation
    return [...root['server']['configService']['dynamicPaths'].entries()]
      .flatMap(([configPath, dynamicConfigKeys]) => {
        return dynamicConfigKeys.map(
          (dynamicConfigKey: string) => `${configPath}.${dynamicConfigKey}`
        );
      })
      .sort();
  }

  /**
   * This test is meant to fail when any setting is flagged as capable
   * of dynamic configuration {@link PluginConfigDescriptor.dynamicConfig}.
   *
   * Please, add your settings to the list with a comment of why it's required to be dynamic.
   *
   * The intent is to trigger a code review from the Core and Security teams to discuss potential issues.
   */
  test('detecting all the settings that have opted-in for dynamic in-memory updates', () => {
    expect(getListOfDynamicConfigPaths()).toStrictEqual([
      // We need this for enriching our Perf tests with more valuable data regarding the steps of the test
      // Also helpful in Cloud & Serverless testing because we can't control the labels in those offerings
      'telemetry.labels',
    ]);
  });
});
