/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { FilterableSource } from '@kbn/data-source';
import { openDataControlEditor } from '../controls/data_controls/open_data_control_editor';
import { createDataControlPanelAction } from './create_data_control_panel_action';

jest.mock('../controls/data_controls/open_data_control_editor', () => ({
  openDataControlEditor: jest.fn(),
}));

jest.mock('../services/kibana_services', () => ({
  dataViewsService: {
    getDefaultDataView: jest.fn().mockResolvedValue({ id: 'default-data-view' }),
  },
}));

const getSource = (id: string, isPersisted: boolean) =>
  ({ id, isPersisted: () => isPersisted } as unknown as FilterableSource);

const esqlSource = {
  id: 'esql-source',
  kind: 'esql',
  isPersisted: () => true,
} as unknown as FilterableSource;

const execute = async (dataSources?: FilterableSource[]) => {
  const embeddable = {
    addNewPanel: jest.fn(),
    dataSources$: new BehaviorSubject<FilterableSource[] | undefined>(dataSources),
  };
  await createDataControlPanelAction().execute({ embeddable });
  return (openDataControlEditor as jest.Mock).mock.calls[0][0].initialState.data_view_id;
};

describe('createDataControlPanelAction', () => {
  beforeEach(() => {
    (openDataControlEditor as jest.Mock).mockClear();
  });

  test('suggests the first persisted data view published by the parent', async () => {
    expect(await execute([getSource('persisted-1', true), getSource('persisted-2', true)])).toBe(
      'persisted-1'
    );
  });

  test('skips ad hoc data views', async () => {
    expect(await execute([getSource('ad-hoc', false), getSource('persisted', true)])).toBe(
      'persisted'
    );
  });

  test('skips ES|QL sources', async () => {
    expect(await execute([esqlSource, getSource('persisted', true)])).toBe('persisted');
  });

  test('falls back to the default data view when only ad hoc data views are published', async () => {
    expect(await execute([getSource('ad-hoc', false)])).toBe('default-data-view');
  });

  test('falls back to the default data view when nothing is published', async () => {
    expect(await execute(undefined)).toBe('default-data-view');
  });
});
