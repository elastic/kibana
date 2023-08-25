/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@kbn/safer-lodash-set';
import { Root } from '@kbn/core-root-server-internal';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

describe('checking migration metadata changes on all registered SO types', () => {
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
