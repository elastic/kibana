/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import { assignSessionDataViewIds } from './assign_session_data_view_ids';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'runtime-inline-id') }));

const mockedUuidv4 = jest.mocked<() => string>(uuidv4);

const inlineDataView: DataViewSpec = {
  title: 'logs-*',
  name: 'Inline logs',
  timeFieldName: '@timestamp',
  sourceFilters: [{ value: 'secret.*' }],
};

const createInlineTab = (
  id: string,
  dataView: DataViewSpec = inlineDataView
): DiscoverSessionTab => ({
  id,
  label: id,
  sort: [],
  columns: [],
  grid: {},
  hideChart: true,
  hideTable: false,
  isTextBasedQuery: false,
  usesAdHocDataView: true,
  serializedSearchSource: {
    index: { ...dataView },
    filter: [
      { meta: {}, query: { match_all: {} } },
      {
        meta: { index: 'foreign-data-view-id' },
        query: { term: { 'service.name': 'api' } },
      },
    ],
  },
});

describe('assignSessionDataViewIds', () => {
  beforeEach(() => {
    mockedUuidv4.mockReset();
    mockedUuidv4.mockReturnValue('runtime-inline-id');
  });

  it('returns the same session when no classic inline view needs an ID', () => {
    const referencedTab = createInlineTab('referenced');
    referencedTab.usesAdHocDataView = false;
    referencedTab.serializedSearchSource = { index: 'saved-data-view' };
    const esqlTab = createInlineTab('esql');
    esqlTab.isTextBasedQuery = true;
    esqlTab.serializedSearchSource.query = { esql: 'FROM logs-*' };
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        createInlineTab('legacy', { ...inlineDataView, id: 'stored-inline-id' }),
        referencedTab,
        esqlTab,
      ],
    });
    const originalSession = cloneDeep(session);

    expect(assignSessionDataViewIds(session, [])).toBe(session);
    expect(session).toStrictEqual(originalSession);
    expect(mockedUuidv4).not.toHaveBeenCalled();
  });

  it('reuses one runtime ID for identical inline data views without mutating the session', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');
    const existingTab = createInlineTab('existing', {
      ...inlineDataView,
      id: 'existing-inline-id',
    });
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a'), createInlineTab('inline-b'), existingTab],
    });
    const originalSession = cloneDeep(session);

    const updatedSession = assignSessionDataViewIds(session, []);

    expect(updatedSession.tabs.slice(0, 2)).toMatchObject([
      { serializedSearchSource: { index: { id: 'runtime-inline-a' } } },
      { serializedSearchSource: { index: { id: 'runtime-inline-a' } } },
    ]);
    expect(updatedSession.tabs[2]).toBe(existingTab);
    expect(updatedSession).not.toBe(session);
    expect(session).toStrictEqual(originalSession);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('uses different runtime IDs for different inline data view specs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a').mockReturnValueOnce('runtime-inline-b');
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        createInlineTab('inline-a'),
        createInlineTab('inline-b', {
          ...inlineDataView,
          sourceFilters: [{ value: 'private.*' }],
        }),
      ],
    });

    const updatedSession = assignSessionDataViewIds(session, []);

    expect(updatedSession.tabs).toMatchObject([
      { serializedSearchSource: { index: { id: 'runtime-inline-a' } } },
      { serializedSearchSource: { index: { id: 'runtime-inline-b' } } },
    ]);
    expect(mockedUuidv4).toHaveBeenCalledTimes(2);
  });

  it('does not reuse the ID of a locally edited inline data view', () => {
    const restoredTab = getTabStateMock({
      id: 'inline-a',
      initialInternalState: {
        serializedSearchSource: {
          index: { id: 'edited-data-view', title: 'other-logs-*' },
        },
      },
    });
    const originalTab = cloneDeep(restoredTab);
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });

    const updatedSession = assignSessionDataViewIds(session, [restoredTab]);

    expect(updatedSession.tabs[0].serializedSearchSource.index).toMatchObject({
      id: 'runtime-inline-id',
      title: 'logs-*',
    });
    expect(restoredTab).toStrictEqual(originalTab);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('prefers the link ID for its tab without replacing another restored tab ID', () => {
    const dataViewSpec = { ...inlineDataView, id: 'link-data-view' };
    const localTabs = ['inline-a', 'inline-b'].map((id) =>
      getTabStateMock({
        id,
        initialInternalState: {
          serializedSearchSource: { index: { ...inlineDataView, id: `local-${id}` } },
        },
      })
    );
    const originalTabs = cloneDeep(localTabs);
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a'), createInlineTab('inline-b')],
    });

    const updatedSession = assignSessionDataViewIds(session, localTabs, {
      tabId: 'inline-b',
      dataViewSpec,
    });

    expect(updatedSession.tabs).toMatchObject(
      ['local-inline-a', 'link-data-view'].map((id) => ({
        serializedSearchSource: {
          index: { id },
          filter: [{ meta: { index: id } }, { meta: { index: 'foreign-data-view-id' } }],
        },
      }))
    );
    expect(localTabs).toStrictEqual(originalTabs);
    expect(mockedUuidv4).not.toHaveBeenCalled();
  });

  it('does not reuse the link ID when its data view differs from the saved view', () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });

    const updatedSession = assignSessionDataViewIds(session, [], {
      tabId: 'inline-a',
      dataViewSpec: { id: 'link-data-view', title: 'other-logs-*' },
    });

    expect(updatedSession.tabs[0].serializedSearchSource.index).toMatchObject({
      id: 'runtime-inline-id',
    });
    expect(updatedSession.tabs[0].serializedSearchSource.filter?.[0].meta.index).toBe(
      'runtime-inline-id'
    );
    expect(updatedSession.tabs[0].serializedSearchSource.filter?.[1].meta.index).toBe(
      'foreign-data-view-id'
    );
  });

  it('collects usable local views before assigning IDs to earlier tabs', () => {
    const localTabs = [
      getTabStateMock({
        id: 'inline-b',
        initialInternalState: {
          serializedSearchSource: {
            index: { ...inlineDataView, id: 'local-inline-id', allowHidden: false },
          },
        },
      }),
      getTabStateMock({
        id: 'esql',
        initialInternalState: {
          serializedSearchSource: {
            index: { ...inlineDataView, id: 'esql-data-view' },
            query: { esql: 'FROM logs-*' },
          },
        },
      }),
      getTabStateMock({
        id: 'without-id',
        initialInternalState: { serializedSearchSource: { index: inlineDataView } },
      }),
    ];
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a'), createInlineTab('inline-b')],
    });

    const updatedSession = assignSessionDataViewIds(session, localTabs);

    expect(updatedSession.tabs).toMatchObject([
      { serializedSearchSource: { index: { id: 'local-inline-id' } } },
      { serializedSearchSource: { index: { id: 'local-inline-id' } } },
    ]);
    expect(mockedUuidv4).not.toHaveBeenCalled();
  });

  it('makes the link ID available to matching tabs before its target tab', () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a'), createInlineTab('inline-b')],
    });

    const updatedSession = assignSessionDataViewIds(session, [], {
      tabId: 'inline-b',
      dataViewSpec: { ...inlineDataView, id: 'link-data-view' },
    });

    expect(updatedSession.tabs).toMatchObject([
      { serializedSearchSource: { index: { id: 'link-data-view' } } },
      { serializedSearchSource: { index: { id: 'link-data-view' } } },
    ]);
    expect(mockedUuidv4).not.toHaveBeenCalled();
  });
});
