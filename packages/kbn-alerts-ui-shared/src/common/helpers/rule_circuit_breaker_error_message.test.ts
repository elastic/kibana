/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getRuleCircuitBreakerErrorMessage,
  parseRuleCircuitBreakerErrorMessage,
} from './rule_circuit_breaker_error_message';

describe('getRuleCircuitBreakerErrorMessage', () => {
  it('should return the correct message', () => {
    expect(
      getRuleCircuitBreakerErrorMessage({
        name: 'test rule',
        action: 'create',
        interval: 5,
        intervalAvailable: 4,
      })
    ).toMatchInlineSnapshot(
      `"Error validating circuit breaker - Rule 'test rule' cannot be created. The maximum number of runs per minute would be exceeded. - The rule has 5 runs per minute; there are only 4 runs per minute available. Before you can modify this rule, you must increase its check interval so that it runs less frequently. Alternatively, disable other rules or change their check intervals."`
    );

    expect(
      getRuleCircuitBreakerErrorMessage({
        name: 'test rule',
        action: 'update',
        interval: 1,
        intervalAvailable: 1,
      })
    ).toMatchInlineSnapshot(
      `"Error validating circuit breaker - Rule 'test rule' cannot be updated. The maximum number of runs per minute would be exceeded. - The rule has 1 run per minute; there is only 1 run per minute available. Before you can modify this rule, you must increase its check interval so that it runs less frequently. Alternatively, disable other rules or change their check intervals."`
    );

    expect(
      getRuleCircuitBreakerErrorMessage({
        name: 'test rule',
        action: 'bulkEdit',
        interval: 1,
        intervalAvailable: 1,
        rules: 5,
      })
    ).toMatchInlineSnapshot(
      `"Error validating circuit breaker - Rules cannot be bulk edited. The maximum number of runs per minute would be exceeded. - The rules have 1 run per minute; there is only 1 run per minute available. Before you can modify these rules, you must disable other rules or change their check intervals so they run less frequently."`
    );
  });

  it('should parse the error message', () => {
    const message = getRuleCircuitBreakerErrorMessage({
      name: 'test rule',
      action: 'create',
      interval: 5,
      intervalAvailable: 4,
    });

    const parsedMessage = parseRuleCircuitBreakerErrorMessage(message);

    expect(parsedMessage.summary).toContain("Rule 'test rule' cannot be created");
    expect(parsedMessage.details).toContain('The rule has 5 runs per minute');
  });

  it('should passthrough the message if it is not related to circuit breakers', () => {
    const parsedMessage = parseRuleCircuitBreakerErrorMessage('random message');

    expect(parsedMessage.summary).toEqual('random message');
    expect(parsedMessage.details).toBeUndefined();
  });
});
