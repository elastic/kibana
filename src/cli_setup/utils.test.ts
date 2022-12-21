/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { decodeEnrollmentToken, getCommand } from './utils';
import type { EnrollmentToken } from '@kbn/interactive-setup-plugin/common';

describe('kibana setup cli', () => {
  describe('getCommand', () => {
    const originalPlatform = process.platform;

    it('should format windows correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      expect(getCommand('kibana')).toEqual('bin\\kibana.bat');
      expect(getCommand('kibana', '--silent')).toEqual('bin\\kibana.bat --silent');
    });

    it('should format unix correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      expect(getCommand('kibana')).toEqual('bin/kibana');
      expect(getCommand('kibana', '--silent')).toEqual('bin/kibana --silent');
    });

    afterAll(function () {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    });
  });

  describe('decodeEnrollmentToken', () => {
    const token: EnrollmentToken = {
      ver: '8.0.0',
      adr: ['localhost:9200'],
      fgr: 'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
      key: 'JH-36HoBo4EYIoVhHh2F:uEo4dksARMq_BSHaAHUr8Q',
    };

    it('should decode a valid token', () => {
      expect(decodeEnrollmentToken(btoa(JSON.stringify(token)))).toEqual({
        adr: ['https://localhost:9200'],
        fgr: 'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
        key: 'SkgtMzZIb0JvNEVZSW9WaEhoMkY6dUVvNGRrc0FSTXFfQlNIYUFIVXI4UQ==',
        ver: '8.0.0',
      });
    });

    it('should not decode an invalid token', () => {
      expect(decodeEnrollmentToken(JSON.stringify(token))).toBeUndefined();
      expect(
        decodeEnrollmentToken(
          btoa(
            JSON.stringify({
              ver: [''],
              adr: null,
              fgr: false,
              key: undefined,
            })
          )
        )
      ).toBeUndefined();
      expect(decodeEnrollmentToken(btoa(JSON.stringify({})))).toBeUndefined();
      expect(decodeEnrollmentToken(btoa(JSON.stringify([])))).toBeUndefined();
      expect(decodeEnrollmentToken(btoa(JSON.stringify(null)))).toBeUndefined();
      expect(decodeEnrollmentToken(btoa(JSON.stringify('')))).toBeUndefined();
    });
  });
});
