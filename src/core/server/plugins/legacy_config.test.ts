/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import { take } from 'rxjs/operators';
import { ConfigService, Env } from '@kbn/config';
import { getEnvOptions, rawConfigServiceMock } from '../config/mocks';
import { getGlobalConfig, getGlobalConfig$, parseCaFingerprints } from './legacy_config';
import { REPO_ROOT } from '@kbn/utils';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { duration } from 'moment';
import { fromRoot } from '@kbn/utils';
import { ByteSizeValue } from '@kbn/config-schema';
import { Server } from '../server';

const TEST_CA_PATH = path.join(__dirname, '__fixtures__', 'test_ca.crt');
const TEST_CA_CONTENTS = fs.readFileSync(TEST_CA_PATH, 'utf-8');

describe('Legacy config', () => {
  let env: Env;
  let logger: ReturnType<typeof loggingSystemMock.create>;

  beforeEach(() => {
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    logger = loggingSystemMock.create();
  });

  const createConfigService = (rawConfig: Record<string, any> = {}): ConfigService => {
    const rawConfigService = rawConfigServiceMock.create({ rawConfig });
    const server = new Server(rawConfigService, env, logger);
    server.setupCoreConfig();
    return server.configService;
  };

  describe('getGlobalConfig', () => {
    it('should return the global config', async () => {
      const configService = createConfigService();
      await configService.validate();

      const legacyConfig = getGlobalConfig(configService);

      expect(legacyConfig).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
          pingTimeout: duration(30, 's'),
          ssl: {
            certificateAuthorityFingerprints: [],
          },
        },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
      });
    });

    it('should provide CA fingerprints', async () => {
      const configService = createConfigService({
        elasticsearch: {
          ssl: {
            certificateAuthorities: [TEST_CA_PATH],
          },
        },
      });
      await configService.validate();

      const legacyConfig = getGlobalConfig(configService);
      expect(legacyConfig.elasticsearch.ssl.certificateAuthorityFingerprints)
        .toMatchInlineSnapshot(`
        Array [
          "23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17",
        ]
      `);
    });
  });

  describe('getGlobalConfig$', () => {
    it('should return an observable for the global config', async () => {
      const configService = createConfigService();
      await configService.validate();

      const legacyConfig = await getGlobalConfig$(configService).pipe(take(1)).toPromise();

      expect(legacyConfig).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
          pingTimeout: duration(30, 's'),
          ssl: {
            certificateAuthorityFingerprints: [],
          },
        },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
      });
    });

    it('should provide CA fingerprints', async () => {
      const configService = createConfigService({
        elasticsearch: {
          ssl: {
            certificateAuthorities: [TEST_CA_PATH],
          },
        },
      });
      await configService.validate();

      const legacyConfig = await getGlobalConfig$(configService).pipe(take(1)).toPromise();
      expect(legacyConfig.elasticsearch.ssl.certificateAuthorityFingerprints)
        .toMatchInlineSnapshot(`
        Array [
          "23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17",
        ]
      `);
    });
  });

  describe('parseCaFingerprints', () => {
    it('handles single CAs', () => {
      expect(parseCaFingerprints([TEST_CA_CONTENTS])).toEqual([
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
      ]);
    });

    it('handles multiple CAs', () => {
      expect(parseCaFingerprints([TEST_CA_CONTENTS, TEST_CA_CONTENTS])).toEqual([
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
      ]);
    });

    it('handles CA bundles', () => {
      const bundledCa = [TEST_CA_CONTENTS, TEST_CA_CONTENTS].join('\n');
      expect(parseCaFingerprints([bundledCa])).toEqual([
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
      ]);
    });

    it('ignores CAs without a begin pragma', () => {
      const invalidCa = 'asdf\n-----END CERTIFICATE-----';
      expect(parseCaFingerprints([invalidCa])).toEqual([]);
    });

    it('ignores CAs without an end pragma', () => {
      const invalidCa = '-----BEGIN CERTIFICATE-----\nasdf';
      expect(parseCaFingerprints([invalidCa])).toEqual([]);
    });

    it('ignores invalid CAs', () => {
      const invalidCa = '-----BEGIN CERTIFICATE-----\nasdf\n-----END CERTIFICATE-----';
      expect(parseCaFingerprints([invalidCa])).toEqual([]);
    });

    it('ignores invalid CAs but still returns valid ones', () => {
      const invalidCa = 'asdf\n-----END CERTIFICATE-----';
      expect(parseCaFingerprints([TEST_CA_CONTENTS, invalidCa])).toEqual([
        '23:14:29:49:F8:84:C6:0E:8F:BE:60:D5:69:CB:4F:35:D5:76:B2:54:E6:FE:8C:93:0D:DD:75:39:FC:64:34:17',
      ]);
    });
  });
});
