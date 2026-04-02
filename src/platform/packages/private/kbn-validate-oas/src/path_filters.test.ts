/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toInstancePathFilter, toYamlSearchPath } from './path_filters';

describe('path filters', () => {
  test('converts human route path to instancePath JSON pointer', () => {
    expect(toInstancePathFilter('/api/fleet/agent_policies')).toBe(
      '/paths/~1api~1fleet~1agent_policies'
    );
  });

  test('normalizes missing leading slash for route-style paths', () => {
    expect(toInstancePathFilter('api/fleet')).toBe('/paths/~1api~1fleet');
  });

  test('preserves legacy JSON pointer filter', () => {
    expect(toInstancePathFilter('/paths/~1api~1fleet')).toBe('/paths/~1api~1fleet');
  });

  test('keeps braces literal when converting route-style path', () => {
    expect(toInstancePathFilter('/api/fleet/agent_policies/{agentPolicyId}')).toBe(
      '/paths/~1api~1fleet~1agent_policies~1{agentPolicyId}'
    );
  });

  test('converts JSON pointer filter back to route path for YAML matching', () => {
    expect(toYamlSearchPath('/paths/~1api~1fleet~1agent_policies~1{agentPolicyId}')).toBe(
      '/api/fleet/agent_policies/{agentPolicyId}'
    );
  });

  test('throws on invalid JSON pointer escape sequence', () => {
    expect(() => toYamlSearchPath('/paths/~1api~2fleet')).toThrow(
      'Invalid JSON pointer escape sequence in token "~1api~2fleet"'
    );
  });

  test('throws on trailing tilde in JSON pointer token', () => {
    expect(() => toYamlSearchPath('/paths/~1api~1fleet~')).toThrow(
      'Invalid JSON pointer escape sequence in token "~1api~1fleet~"'
    );
  });

  test('preserves human route filter for YAML matching', () => {
    expect(toYamlSearchPath('/api/fleet/agent_policies')).toBe('/api/fleet/agent_policies');
  });
});
