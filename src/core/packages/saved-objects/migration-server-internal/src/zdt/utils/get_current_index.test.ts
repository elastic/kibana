/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCurrentIndex } from './get_current_index';

describe('getCurrentIndex', () => {
  it('returns the target of the alias matching the index prefix if present in the list', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_1', '.kibana_2', '.kibana_8.8.0_001'],
        indexPrefix: '.kibana',
        aliases: {
          '.kibana': '.kibana_8.8.0_001',
        },
      })
    ).toEqual('.kibana_8.8.0_001');
  });

  it('ignores the target of the alias matching the index prefix if not present in the list', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_1'],
        indexPrefix: '.kibana',
        aliases: {
          '.kibana': '.foobar_9000',
        },
      })
    ).toEqual('.kibana_1');
  });

  it('returns the highest numbered index matching the index prefix', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_1', '.kibana_2'],
        indexPrefix: '.kibana',
        aliases: {},
      })
    ).toEqual('.kibana_2');
  });

  it('ignores other indices', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_1', '.kibana_2', '.foo_3'],
        indexPrefix: '.kibana',
        aliases: {},
      })
    ).toEqual('.kibana_2');
  });

  it('ignores other indices including the prefix', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_1', '.kibana_2', '.kibana_task_manager_3'],
        indexPrefix: '.kibana',
        aliases: {},
      })
    ).toEqual('.kibana_2');
  });

  it('ignores other indices including a subpart of the prefix', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_3', '.kibana_task_manager_1', '.kibana_task_manager_2'],
        indexPrefix: '.kibana_task_manager',
        aliases: {},
      })
    ).toEqual('.kibana_task_manager_2');
  });

  it('returns undefined if no indices match', () => {
    expect(
      getCurrentIndex({
        indices: ['.kibana_task_manager_1', '.kibana_task_manager_2'],
        indexPrefix: '.kibana',
        aliases: {},
      })
    ).toBeUndefined();
  });
});
