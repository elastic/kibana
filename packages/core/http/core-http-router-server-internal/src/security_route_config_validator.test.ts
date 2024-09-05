/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validRouteSecurity } from './security_route_config_validator';

describe('RouteSecurity validation', () => {
  it('should pass validation for valid route security with authz enabled and valid required privileges', () => {
    expect(() =>
      validRouteSecurity({
        authz: {
          requiredPrivileges: ['read', { anyRequired: ['write', 'admin'] }],
        },
        authc: {
          enabled: 'optional',
        },
      })
    ).not.toThrow();
  });

  it('should pass validation for valid route security with authz disabled', () => {
    expect(() =>
      validRouteSecurity({
        authz: {
          enabled: false,
          reason: 'Authorization is disabled',
        },
        authc: {
          enabled: true,
        },
      })
    ).not.toThrow();
  });

  it('should fail validation when authz is empty', () => {
    const routeSecurity = {
      authz: {},
      authc: {
        enabled: true,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(
      `"[authz.requiredPrivileges]: expected value of type [array] but got [undefined]"`
    );
  });

  it('should fail when requiredPrivileges include an empty privilege set', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [{}],
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(`
      "[authz.requiredPrivileges.0]: types that failed validation:
      - [authz.requiredPrivileges.0.0]: either anyRequired or allRequired must be specified
      - [authz.requiredPrivileges.0.1]: expected value of type [string] but got [Object]"
    `);
  });

  it('should fail validation when requiredPrivileges array is empty', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [],
      },
      authc: {
        enabled: true,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(
      `"[authz.requiredPrivileges]: array size is [0], but cannot be smaller than [1]"`
    );
  });

  it('should fail validation when anyRequired array is empty', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [{ anyRequired: [] }],
      },
      authc: {
        enabled: true,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(`
      "[authz.requiredPrivileges.0]: types that failed validation:
      - [authz.requiredPrivileges.0.0.anyRequired]: array size is [0], but cannot be smaller than [2]
      - [authz.requiredPrivileges.0.1]: expected value of type [string] but got [Object]"
    `);
  });

  it('should fail validation when anyRequired array is of size 1', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [{ anyRequired: ['privilege-1'], allRequired: ['privilege-2'] }],
      },
      authc: {
        enabled: true,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(`
      "[authz.requiredPrivileges.0]: types that failed validation:
      - [authz.requiredPrivileges.0.0.anyRequired]: array size is [1], but cannot be smaller than [2]
      - [authz.requiredPrivileges.0.1]: expected value of type [string] but got [Object]"
    `);
  });

  it('should fail validation when allRequired array is empty', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [{ allRequired: [] }],
      },
      authc: {
        enabled: true,
      },
    };

    // TODO: [Authz] expected value of type [string] but got [Object] is incorrect there
    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(`
      "[authz.requiredPrivileges.0]: types that failed validation:
      - [authz.requiredPrivileges.0.0.allRequired]: array size is [0], but cannot be smaller than [1]
      - [authz.requiredPrivileges.0.1]: expected value of type [string] but got [Object]"
    `);
  });

  it('should pass validation with valid privileges in both anyRequired and allRequired', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: [
          { anyRequired: ['privilege1', 'privilege2'], allRequired: ['privilege3', 'privilege4'] },
        ],
      },
      authc: {
        enabled: true,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).not.toThrow();
  });

  it('should fail validation when authz is disabled but reason is missing', () => {
    expect(() =>
      validRouteSecurity({
        authz: {
          enabled: false,
        },
        authc: {
          enabled: true,
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[authz.reason]: expected value of type [string] but got [undefined]"`
    );
  });

  it('should fail validation when authc is disabled but reason is missing', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: ['read'],
      },
      authc: {
        enabled: false,
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).toThrowErrorMatchingInlineSnapshot(
      `"[authc.reason]: expected value of type [string] but got [undefined]"`
    );
  });

  it('should pass validation when authc is optional', () => {
    expect(() =>
      validRouteSecurity({
        authz: {
          requiredPrivileges: ['read'],
        },
        authc: {
          enabled: 'optional',
        },
      })
    ).not.toThrow();
  });

  it('should pass validation when authc is disabled', () => {
    const routeSecurity = {
      authz: {
        requiredPrivileges: ['read'],
      },
      authc: {
        enabled: false,
        reason: 'Authentication is disabled',
      },
    };

    expect(() => validRouteSecurity(routeSecurity)).not.toThrow();
  });

  it('should fail validation when anyRequired and allRequired have the same values', () => {
    const invalidRouteSecurity = {
      authz: {
        requiredPrivileges: [
          { anyRequired: ['privilege1', 'privilege2'], allRequired: ['privilege1'] },
        ],
      },
    };

    expect(() => validRouteSecurity(invalidRouteSecurity)).toThrowErrorMatchingInlineSnapshot(
      `"[authz.requiredPrivileges]: anyRequired and allRequired cannot have the same values: [privilege1]"`
    );
  });

  it('should fail validation when anyRequired and allRequired have the same values in multiple entries', () => {
    const invalidRouteSecurity = {
      authz: {
        requiredPrivileges: [
          { anyRequired: ['privilege1', 'privilege2'], allRequired: ['privilege4'] },
          { anyRequired: ['privilege3', 'privilege5'], allRequired: ['privilege2'] },
        ],
      },
    };

    expect(() => validRouteSecurity(invalidRouteSecurity)).toThrowErrorMatchingInlineSnapshot(
      `"[authz.requiredPrivileges]: anyRequired and allRequired cannot have the same values: [privilege2]"`
    );
  });
});
