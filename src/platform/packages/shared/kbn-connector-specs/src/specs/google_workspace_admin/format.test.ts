/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { redactVerificationCodes, toDeviceSummary, toUserSummary } from './format';
import { USER } from './test_helpers';

describe('Google Workspace Admin response shaping', () => {
  it('keeps only the summary fields of a user, with the full name', () => {
    const summary = toUserSummary(USER);
    expect(Object.keys(summary)).toEqual([
      'id',
      'primaryEmail',
      'fullName',
      'suspended',
      'archived',
      'orgUnitPath',
      'isAdmin',
      'isDelegatedAdmin',
      'isEnrolledIn2Sv',
      'isEnforcedIn2Sv',
      'lastLoginTime',
      'creationTime',
    ]);
    expect(summary).not.toHaveProperty('recoveryEmail');
  });

  it('keeps the suspension reason of a suspended user', () => {
    expect(toUserSummary({ id: '1', suspended: true, suspensionReason: 'ABUSE' })).toEqual({
      id: '1',
      suspended: true,
      suspensionReason: 'ABUSE',
    });
  });

  it('tolerates a record that is not an object', () => {
    expect(toUserSummary(null)).toEqual({});
    expect(toDeviceSummary('x')).toEqual({});
  });

  it('keeps only the summary fields of a device', () => {
    expect(
      toDeviceSummary({
        resourceId: 'r',
        status: 'BLOCKED',
        imei: '35',
        serialNumber: 'SN',
        applications: [{ packageName: 'a' }],
      })
    ).toEqual({ resourceId: 'r', status: 'BLOCKED' });
  });

  it('drops every backup code value and counts the codes', () => {
    const result = redactVerificationCodes([
      { userId: 'u1', verificationCode: '11112222', etag: 'e' },
      { verificationCode: '33334444' },
    ]);
    expect(result).toEqual({ count: 2, items: [{ userId: 'u1' }, {}] });
    expect(JSON.stringify(result)).not.toMatch(/11112222|33334444/);
  });
});
