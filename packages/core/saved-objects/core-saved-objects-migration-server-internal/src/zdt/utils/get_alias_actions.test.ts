/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAliasActions } from './get_alias_actions';

describe('getAliasActions', () => {
  it('creates the global and version aliases', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana',
      currentIndex: '.kibana_1',
      existingAliases: [],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([
      { add: { alias: '.kibana', index: '.kibana_1' } },
      { add: { alias: '.kibana_8.7.0', index: '.kibana_1' } },
    ]);
  });

  it('does not create the version alias when already present', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana',
      currentIndex: '.kibana_1',
      existingAliases: ['.kibana_8.7.0'],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([{ add: { alias: '.kibana', index: '.kibana_1' } }]);
  });

  it('does not create the global alias when already present', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana',
      currentIndex: '.kibana_1',
      existingAliases: ['.kibana'],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([{ add: { alias: '.kibana_8.7.0', index: '.kibana_1' } }]);
  });

  it('creates nothing when both aliases are present', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana',
      currentIndex: '.kibana_1',
      existingAliases: ['.kibana', '.kibana_8.7.0'],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([]);
  });

  it('ignores other aliases', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana',
      currentIndex: '.kibana_1',
      existingAliases: ['.kibana_8.6.0', '.kibana_old'],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([
      { add: { alias: '.kibana', index: '.kibana_1' } },
      { add: { alias: '.kibana_8.7.0', index: '.kibana_1' } },
    ]);
  });

  it('accepts other prefixes', () => {
    const actions = getAliasActions({
      indexPrefix: '.kibana_task_manager',
      currentIndex: '.kibana_task_manager_2',
      existingAliases: [],
      kibanaVersion: '8.7.0',
    });

    expect(actions).toEqual([
      { add: { alias: '.kibana_task_manager', index: '.kibana_task_manager_2' } },
      { add: { alias: '.kibana_task_manager_8.7.0', index: '.kibana_task_manager_2' } },
    ]);
  });
});
