/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import Fs from 'fs';
import Path from 'path';
import Util from 'util';
import del from 'del';

import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { fromRoot } from '../../utils';
import {
  getPlatformLoggingContent as _getPlatformLoggingContent,
  getLegacyPlatformLoggingContent as _getLegacyPlatformLoggingContent,
} from '../../logging/integration_tests/utils';

import { LegacyLoggingConfig } from '../config/legacy_object_to_config_adapter';

const mkdir = Util.promisify(Fs.mkdir);
const truncate = Util.promisify(Fs.truncate);

const tempFolderPath = fromRoot('data/test/tmp-logging-service');
const platformDestination = Path.join(tempFolderPath, 'compatibility-np.txt');
const legacyPlatformDestination = Path.join(tempFolderPath, 'compatibility-lp.txt');

const getPlatformLoggingContent = () => _getPlatformLoggingContent(platformDestination);
const getLegacyPlatformLoggingContent = () =>
  _getLegacyPlatformLoggingContent(legacyPlatformDestination);

function createRoot(legacyLoggingConfig: LegacyLoggingConfig = {}) {
  return kbnTestServer.createRoot({
    logging: {
      // legacy platform config
      silent: false,
      dest: legacyPlatformDestination,
      json: false,
      ...legacyLoggingConfig,
      events: {
        log: ['test-file-legacy'],
      },
      // platform config
      appenders: {
        file: {
          kind: 'file',
          path: platformDestination,
          layout: {
            kind: 'pattern',
          },
        },
      },
      loggers: [
        {
          context: 'test-file',
          appenders: ['file'],
          level: 'info',
        },
      ],
    },
  });
}

describe('logging service', () => {
  describe('compatibility', () => {
    beforeAll(async () => {
      await mkdir(tempFolderPath, { recursive: true });
    });
    afterAll(async () => {
      await del(tempFolderPath);
    });
    afterEach(async () => {
      await truncate(platformDestination);
      await truncate(legacyPlatformDestination);
    });
    describe('uses configured loggers', () => {
      let root: ReturnType<typeof createRoot>;
      beforeAll(async () => {
        root = createRoot();

        await root.setup();
        await root.start();
      }, 30000);

      afterAll(async () => {
        await root.shutdown();
      });

      it('when context matches', async () => {
        root.logger.get('test-file').info('handled by NP');

        expect(await getPlatformLoggingContent()).toMatchInlineSnapshot(`
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] handled by NP
            "
        `);

        expect(await getLegacyPlatformLoggingContent()).toHaveLength(0);
      });

      it('falls back to the root legacy logger otherwise', async () => {
        root.logger.get('test-file-legacy').info('handled by LP');

        expect(await getLegacyPlatformLoggingContent()).toMatchInlineSnapshot(`
            "  log   [xx:xx:xx.xxx] [info][test-file-legacy] handled by LP
            "
        `);
        expect(await getPlatformLoggingContent()).toHaveLength(0);
      });
    });

    describe('logging config respects legacy logging settings', () => {
      it('"silent": true', async () => {
        const root = createRoot({ silent: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        // calls shutdown to close write stream and flush logged messages
        await root.shutdown();

        expect(await getPlatformLoggingContent()).toMatchInlineSnapshot(`
          "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info
          [xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn
          [xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error
          "
        `);

        expect(await getLegacyPlatformLoggingContent()).toHaveLength(0);
      });

      it('"quiet": true', async () => {
        const root = createRoot({ quiet: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        // calls shutdown to close write stream and flush logged messages
        await root.shutdown();

        expect(await getPlatformLoggingContent()).toMatchInlineSnapshot(`
          "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info
          [xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn
          [xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error
          "
        `);

        expect(await getLegacyPlatformLoggingContent()).toMatchInlineSnapshot(`
          "  log   [xx:xx:xx.xxx] [error][test-file-legacy] error
          "
        `);
      });

      it('"verbose": true', async () => {
        const root = createRoot({ verbose: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        // calls shutdown to close write stream and flush logged messages
        await root.shutdown();

        expect(await getPlatformLoggingContent()).toMatchInlineSnapshot(`
          "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info
          [xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn
          [xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error
          "
        `);

        expect(await getLegacyPlatformLoggingContent()).toMatchInlineSnapshot(`
          "  log   [xx:xx:xx.xxx] [info][test-file-legacy] info
            log   [xx:xx:xx.xxx] [warning][test-file-legacy] warn
            log   [xx:xx:xx.xxx] [error][test-file-legacy] error
          "
        `);
      });
    });
  });
});
