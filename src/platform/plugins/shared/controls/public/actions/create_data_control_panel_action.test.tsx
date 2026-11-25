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
import { dataViewsService } from '../services/kibana_services';
import {
  createDataControlPanelAction,
  getFirstPersistedDataViewId,
} from './create_data_control_panel_action';

jest.mock('../controls/data_controls/open_data_control_editor', () => ({
  openDataControlEditor: jest.fn(),
}));

const getSource = (id: string, isPersisted: boolean) =>
  ({ id, isPersisted: () => isPersisted } as unknown as FilterableSource);

const esqlSource = {
  id: 'esql-source',
  kind: 'esql',
  isPersisted: () => true,
} as unknown as FilterableSource;

const getEmbeddable = (dataSources?: FilterableSource[]) => ({
  dataSources$: new BehaviorSubject<FilterableSource[] | undefined>(dataSources),
});

describe('getFirstPersistedDataViewId', () => {
  test('returns the first persisted data view', () => {
    expect(
      getFirstPersistedDataViewId(
        getEmbeddable([getSource('persisted-1', true), getSource('persisted-2', true)])
      )
    ).toBe('persisted-1');
  });

  test('skips ad hoc data views', () => {
    expect(
      getFirstPersistedDataViewId(
        getEmbeddable([getSource('ad-hoc', false), getSource('persisted', true)])
      )
    ).toBe('persisted');
  });

  test('skips ES|QL sources', () => {
    expect(
      getFirstPersistedDataViewId(getEmbeddable([esqlSource, getSource('persisted', true)]))
    ).toBe('persisted');
  });

  test('returns undefined when only ad hoc data views are published', () => {
    expect(
      getFirstPersistedDataViewId(getEmbeddable([getSource('ad-hoc', false)]))
    ).toBeUndefined();
  });

  test('returns undefined when no data sources are published', () => {
    expect(getFirstPersistedDataViewId(getEmbeddable(undefined))).toBeUndefined();
  });

  test('returns undefined when the embeddable does not publish data sources', () => {
    expect(getFirstPersistedDataViewId({})).toBeUndefined();
  });
});

describe('createDataControlPanelAction', () => {
  const createEmbeddable = ({
    published,
    defaultDataViewId,
  }: {
    published?: FilterableSource[];
    defaultDataViewId?: string;
  }) => ({
    addNewPanel: jest.fn(),
    ...getEmbeddable(published),
    ...(defaultDataViewId ? { getEditorConfig: () => ({ defaultDataViewId }) } : {}),
  });

  const execute = async (embeddable: ReturnType<typeof createEmbeddable>) => {
    await createDataControlPanelAction().execute({ embeddable } as never);
    return (openDataControlEditor as jest.Mock).mock.calls[0][0].initialState.data_view_id;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.getDefaultDataView = jest.fn().mockResolvedValue({ id: 'default-data-view' });
  });

  it('starts from the first published data view', async () => {
    await expect(
      execute(createEmbeddable({ published: [getSource('published-data-view', true)] }))
    ).resolves.toBe('published-data-view');
  });

  it('skips a published ES|QL source, whose id is not a data view, and uses the next data view', async () => {
    await expect(
      execute(createEmbeddable({ published: [esqlSource, getSource('published-data-view', true)] }))
    ).resolves.toBe('published-data-view');
  });

  it('starts from the default data view when only ES|QL sources are published', async () => {
    await expect(execute(createEmbeddable({ published: [esqlSource] }))).resolves.toBe(
      'default-data-view'
    );
  });

  it('starts from the default data view when nothing is published', async () => {
    await expect(execute(createEmbeddable({ published: [] }))).resolves.toBe('default-data-view');
  });

  it('prefers the default data view of the editor config over a published one', async () => {
    await expect(
      execute(
        createEmbeddable({
          published: [getSource('published-data-view', true)],
          defaultDataViewId: 'configured-data-view',
        })
      )
    ).resolves.toBe('configured-data-view');
  });
});
