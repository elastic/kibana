/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { migrateExecutionFilterControls } from './migrate_execution_filter_controls';
import {
  EXECUTED_BY_FILTER_FIELD,
  LEGACY_EXECUTED_BY_FILTER_FIELD,
} from './workflow_executions_page_constants';

describe('migrateExecutionFilterControls', () => {
  const status = { field_name: 'status', selected_options: ['failed'] };

  it('rewrites a saved executedBy control onto the display-name field and drops UID selections', () => {
    expect(
      migrateExecutionFilterControls(
        [
          status,
          {
            field_name: LEGACY_EXECUTED_BY_FILTER_FIELD,
            selected_options: ['u_jane'],
            title: 'Triggered by',
          },
        ],
        true
      )
    ).toEqual([
      status,
      {
        field_name: EXECUTED_BY_FILTER_FIELD,
        selected_options: [],
        title: 'Triggered by',
      },
    ]);
  });

  it('drops a legacy executedBy control when the display-name control is already present', () => {
    const displayName = { field_name: EXECUTED_BY_FILTER_FIELD, selected_options: ['Jane Doe'] };

    expect(
      migrateExecutionFilterControls(
        [
          displayName,
          { field_name: LEGACY_EXECUTED_BY_FILTER_FIELD, selected_options: ['u_jane'] },
        ],
        true
      )
    ).toEqual([displayName]);
  });

  it('removes every executor control when executor identities are hidden', () => {
    expect(
      migrateExecutionFilterControls(
        [
          status,
          { field_name: LEGACY_EXECUTED_BY_FILTER_FIELD, selected_options: ['u_jane'] },
          { field_name: EXECUTED_BY_FILTER_FIELD, selected_options: ['Jane Doe'] },
          { field_name: 'triggeredBy' },
        ],
        false
      )
    ).toEqual([status, { field_name: 'triggeredBy' }]);
  });
});
