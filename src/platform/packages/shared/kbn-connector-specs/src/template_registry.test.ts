/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

const mockLogger: Pick<Logger, 'info' | 'warn' | 'error' | 'debug'> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

import { ConnectorTemplateRegistry } from './template_registry';

describe('CONN-006: Package-shippable connector query templates', () => {
  let registry: ConnectorTemplateRegistry;

  beforeEach(() => {
    registry = new ConnectorTemplateRegistry(mockLogger as Logger);
  });

  it('registers a namespaced read-only template', () => {
    registry.register({
      id: 'sdlcIntel.roadmap',
      query: 'query { repository(name: "kibana") { name } }',
      description: 'Get repo roadmap',
    });
    expect(registry.get('sdlcIntel.roadmap')).toBeDefined();
    expect(registry.list()).toContain('sdlcIntel.roadmap');
  });

  it('rejects a template with a GraphQL mutation', () => {
    expect(() =>
      registry.register({
        id: 'sdlcIntel.mutate',
        query: 'mutation { createIssue(title: "test") { id } }',
      })
    ).toThrow('mutation');
  });

  it('rejects a template without namespace (no dot)', () => {
    expect(() =>
      registry.register({
        id: 'coreTemplate',
        query: 'query { viewer { login } }',
      })
    ).toThrow('namespaced');
  });

  it('rejects duplicate template registration', () => {
    registry.register({
      id: 'pkg.one',
      query: 'query { viewer { login } }',
    });
    expect(() =>
      registry.register({
        id: 'pkg.one',
        query: 'query { viewer { login } }',
      })
    ).toThrow('already registered');
  });

  it('removes templates by package on uninstall', () => {
    registry.register({ id: 'pkg.a', query: 'query { a }' });
    registry.register({ id: 'pkg.b', query: 'query { b }' });
    registry.register({ id: 'other.c', query: 'query { c }' });

    const removed = registry.removeByPackage('pkg');
    expect(removed).toBe(2);
    expect(registry.get('pkg.a')).toBeUndefined();
    expect(registry.get('pkg.b')).toBeUndefined();
    expect(registry.get('other.c')).toBeDefined();
  });

  it('returns undefined for unknown template', () => {
    expect(registry.get('unknown.template')).toBeUndefined();
  });
});
