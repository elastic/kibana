/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkloadTypeRegistry } from './workload_type_registry';

describe('WorkloadTypeRegistry', () => {
  let registry: WorkloadTypeRegistry;

  beforeEach(() => {
    registry = new WorkloadTypeRegistry();
  });

  it('records a registration for the plugin and type', () => {
    registry.register('alerting', { type: 'rule', name: 'Alerting rule', description: 'Runs' });

    expect(registry.isRegistered('alerting', 'rule')).toBe(true);
    expect(registry.get('alerting', 'rule')).toEqual({
      type: 'rule',
      name: 'Alerting rule',
      description: 'Runs',
    });
  });

  it('does not know types that were never registered', () => {
    expect(registry.isRegistered('alerting', 'rule')).toBe(false);
    expect(registry.get('alerting', 'rule')).toBeUndefined();
  });

  it('scopes types to the registering plugin', () => {
    registry.register('alerting', { type: 'rule', name: 'Alerting rule' });

    expect(registry.isRegistered('workflows', 'rule')).toBe(false);
    expect(() =>
      registry.register('workflows', { type: 'rule', name: 'Workflow rule' })
    ).not.toThrow();
    expect(registry.get('workflows', 'rule')?.name).toBe('Workflow rule');
  });

  it('accepts lowercase alphanumerics and underscores', () => {
    for (const type of ['rule', 'alerting_rule', 'job2', '_', '0']) {
      expect(() => registry.register('alerting', { type, name: 'Name' })).not.toThrow();
    }
  });

  it.each(['Rule', 'alerting-rule', 'alerting.rule', 'alerting:rule', 'rule ', '', 'rüle'])(
    'rejects the type [%s]',
    (type) => {
      expect(() => registry.register('alerting', { type, name: 'Name' })).toThrow(
        `Invalid service account workload type [${type}] registered by plugin [alerting]: only lowercase letters, digits and underscores are allowed.`
      );
    }
  );

  it('rejects a type longer than 256 characters', () => {
    expect(() =>
      registry.register('alerting', { type: 'a'.repeat(256), name: 'Name' })
    ).not.toThrow();
    expect(() => registry.register('alerting', { type: 'b'.repeat(257), name: 'Name' })).toThrow(
      'Service account workload type registered by plugin [alerting] is too long: it must be at most 256 characters, but got 257.'
    );
  });

  it('rejects an empty name', () => {
    expect(() => registry.register('alerting', { type: 'rule', name: '  ' })).toThrow(
      'Service account workload type [rule] registered by plugin [alerting] must have a non-empty name.'
    );
  });

  it('rejects a name longer than 256 characters', () => {
    expect(() =>
      registry.register('alerting', { type: 'rule', name: 'a'.repeat(256) })
    ).not.toThrow();
    expect(() => registry.register('alerting', { type: 'job', name: 'b'.repeat(257) })).toThrow(
      'Service account workload type [job] registered by plugin [alerting] has a name that is too long: it must be at most 256 characters, but got 257.'
    );
  });

  it('rejects a description longer than 1024 characters', () => {
    expect(() =>
      registry.register('alerting', { type: 'rule', name: 'Name', description: 'a'.repeat(1024) })
    ).not.toThrow();
    expect(() =>
      registry.register('alerting', { type: 'job', name: 'Name', description: 'b'.repeat(1025) })
    ).toThrow(
      'Service account workload type [job] registered by plugin [alerting] has a description that is too long: it must be at most 1024 characters, but got 1025.'
    );
  });

  it('rejects a duplicate type from the same plugin', () => {
    registry.register('alerting', { type: 'rule', name: 'Alerting rule' });

    expect(() => registry.register('alerting', { type: 'rule', name: 'Again' })).toThrow(
      'Service account workload type [rule] has already been registered by plugin [alerting].'
    );
    expect(registry.get('alerting', 'rule')?.name).toBe('Alerting rule');
  });

  it('does not record a registration it rejected', () => {
    expect(() => registry.register('alerting', { type: 'Nope', name: 'Name' })).toThrow();
    expect(() => registry.register('alerting', { type: 'rule', name: '' })).toThrow();

    expect(registry.isRegistered('alerting', 'Nope')).toBe(false);
    expect(registry.isRegistered('alerting', 'rule')).toBe(false);
  });

  it('stores a copy of the registration', () => {
    const registration = { type: 'rule', name: 'Alerting rule' };
    registry.register('alerting', registration);
    registration.name = 'Changed';

    expect(registry.get('alerting', 'rule')?.name).toBe('Alerting rule');
  });
});
