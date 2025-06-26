/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as errors from './errors';

const { ReportingError: _, ...nonAbstractErrors } = errors;

describe('Reporting error', () => {
  it('provides error code when stringified', () => {
    expect(new errors.AuthenticationExpiredError() + '').toBe(
      `ReportingError(code: authentication_expired_error)`
    );
  });
  it('provides details if there are any and error code when stringified', () => {
    expect(new errors.AuthenticationExpiredError('some details') + '').toBe(
      `ReportingError(code: authentication_expired_error) "some details"`
    );
  });
  it('has the expected error code structure', () => {
    Object.values(nonAbstractErrors).forEach((Ctor) => {
      expect(Ctor.code).toMatch(/^[a-z_]+_error$/);
    });
  });
  it('has the same error code values on static "code" and instance "code" properties', () => {
    Object.values(nonAbstractErrors).forEach((Ctor) => {
      expect(Ctor.code).toBe(new Ctor().code);
    });
  });
});
