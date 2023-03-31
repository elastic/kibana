/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCurrentIndex } from './get_current_index';
import type { FetchIndexResponse } from '../../actions';

describe('getCurrentIndex', () => {
  const createIndexResponse = (...indexNames: string[]): FetchIndexResponse => {
    return indexNames.reduce<FetchIndexResponse>((resp, indexName) => {
      resp[indexName] = { aliases: {}, mappings: { properties: {} }, settings: {} };
      return resp;
    }, {});
  };

  it('returns the highest numbered index matching the index prefix', () => {
    const resp = createIndexResponse('.kibana_1', '.kibana_2');
    expect(getCurrentIndex(resp, '.kibana')).toEqual('.kibana_2');
  });

  it('ignores other indices', () => {
    const resp = createIndexResponse('.kibana_1', '.kibana_2', '.foo_3');
    expect(getCurrentIndex(resp, '.kibana')).toEqual('.kibana_2');
  });

  it('ignores other indices including the prefix', () => {
    const resp = createIndexResponse('.kibana_1', '.kibana_2', '.kibana_task_manager_3');
    expect(getCurrentIndex(resp, '.kibana')).toEqual('.kibana_2');
  });

  it('ignores other indices including a subpart of the prefix', () => {
    const resp = createIndexResponse(
      '.kibana_3',
      '.kibana_task_manager_1',
      '.kibana_task_manager_2'
    );
    expect(getCurrentIndex(resp, '.kibana_task_manager')).toEqual('.kibana_task_manager_2');
  });

  it('returns undefined if no indices match', () => {
    const resp = createIndexResponse('.kibana_task_manager_1', '.kibana_task_manager_2');
    expect(getCurrentIndex(resp, '.kibana')).toBeUndefined();
  });
});
