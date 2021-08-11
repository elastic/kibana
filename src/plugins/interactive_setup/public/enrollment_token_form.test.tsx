/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EnrollmentToken } from '../common';
import { decodeEnrollmentToken } from './enrollment_token_form';

const token: EnrollmentToken = {
  ver: '8.0.0',
  adr: ['localhost:9200'],
  fgr:
    'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
  key: 'JH-36HoBo4EYIoVhHh2F:uEo4dksARMq_BSHaAHUr8Q',
};

describe('decodeEnrollmentToken', () => {
  it('should decode a valid token', () => {
    expect(decodeEnrollmentToken(btoa(JSON.stringify(token)))).toEqual(token);
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
