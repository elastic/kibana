/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under the "Elastic License 2.0",
 * the "GNU Affero General Public License v3.0 only", and the "Server Side Public License v 1";
 * you may not use this file except in compliance with, at your election, the "Elastic License 2.0",
 * the "GNU Affero General Public License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

import { buildFilter } from './filter_utils';
import { NO_ASSIGNEES_OPTION_KEY } from '../constants';

describe('options list buildFilter', () => {
  const dataView = createStubDataView({
    spec: {
      id: 'test-dv',
      title: 'test-*',
      fields: {
        'kibana.alert.workflow_assignee_ids': {
          name: 'kibana.alert.workflow_assignee_ids',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: true,
          searchable: true,
        },
      },
    },
  });

  it('builds a combined filter for assignee ids + no assignees', () => {
    const filter = buildFilter(dataView as any, 'control-1', {
      field_name: 'kibana.alert.workflow_assignee_ids',
      exists_selected: false,
      exclude: true,
      selected_options: ['user-1', NO_ASSIGNEES_OPTION_KEY],
    });

    expect(filter?.query).toEqual({
      bool: {
        should: [
          { match_phrase: { 'kibana.alert.workflow_assignee_ids': 'user-1' } },
          { bool: { must_not: { exists: { field: 'kibana.alert.workflow_assignee_ids' } } } },
        ],
        minimum_should_match: 1,
      },
    });
    expect(filter?.meta).toEqual(
      expect.objectContaining({
        index: 'test-dv',
        key: 'kibana.alert.workflow_assignee_ids',
        controlledBy: 'control-1',
        negate: false, // never negated for assignees
      })
    );
  });
});

