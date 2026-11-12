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
import { createDataControlPanelAction } from './create_data_control_panel_action';

jest.mock('../controls/data_controls/open_data_control_editor', () => ({
  openDataControlEditor: jest.fn(),
}));

const dataViewSource = (id: string): FilterableSource => ({
  id,
  title: id,
  fields: [],
  isTimeBased: () => false,
});

const esqlSource = (id: string): FilterableSource => ({ ...dataViewSource(id), kind: 'esql' });

const createEmbeddable = ({
  published,
  defaultDataViewId,
}: {
  published?: FilterableSource[];
  defaultDataViewId?: string;
}) => ({
  addNewPanel: jest.fn(),
  dataSources$: new BehaviorSubject<FilterableSource[] | undefined>(published),
  ...(defaultDataViewId ? { getEditorConfig: () => ({ defaultDataViewId }) } : {}),
});

const execute = async (embeddable: ReturnType<typeof createEmbeddable>) => {
  await createDataControlPanelAction().execute({ embeddable } as never);
  return (openDataControlEditor as jest.Mock).mock.calls[0][0].initialState.data_view_id;
};

describe('createDataControlPanelAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.getDefaultDataView = jest.fn().mockResolvedValue({ id: 'default-data-view' });
  });

  it('starts from the first published data view', async () => {
    await expect(
      execute(createEmbeddable({ published: [dataViewSource('published-data-view')] }))
    ).resolves.toBe('published-data-view');
  });

  it('skips a published ES|QL source, whose id is not a data view, and uses the next data view', async () => {
    await expect(
      execute(
        createEmbeddable({
          published: [esqlSource('esql-dataset-id'), dataViewSource('published-data-view')],
        })
      )
    ).resolves.toBe('published-data-view');
  });

  it('starts from the default data view when only ES|QL sources are published', async () => {
    await expect(
      execute(createEmbeddable({ published: [esqlSource('esql-dataset-id')] }))
    ).resolves.toBe('default-data-view');
  });
});
