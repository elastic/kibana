/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import type { CombinedFilter } from '@kbn/es-query';
import { BooleanRelation, FILTERS, FilterStateStore } from '@kbn/es-query';
import { parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { DataGridDensity, DiscoverTabType, VIEW_MODE } from '@kbn/discover-session-constants';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { createDiscoverSessionMock } from '../mocks';
import type { DiscoverSession, DiscoverSessionTab } from '../types';
import { discoverSession, storedDiscoverSession } from './discover_session.fixtures';
import { saveDiscoverSession } from '../../public/service/save_discover_session';
import { getDiscoverSession } from './get_discover_session';
import type { DiscoverSessionTagging } from './discover_session_serialization';
import {
  deserializeDiscoverSession,
  serializeDiscoverSession,
  type StoredDiscoverSession,
} from './discover_session_serialization';

const sharedDataViewId = '1b80e276-9af6-41c8-8093-32a5ac0f2680';
const independentDataViewId = '61679a15-c7ce-4127-8576-39e5c016dc44';

const createTab = (id: string, dataViewId: string): DiscoverSessionTab => {
  const combinedFilter: CombinedFilter = {
    $state: { store: FilterStateStore.GLOBAL_STATE },
    meta: {
      index: dataViewId,
      type: FILTERS.COMBINED,
      relation: BooleanRelation.OR,
      disabled: false,
      negate: false,
      alias: 'Nested conditions',
      params: [
        {
          meta: { index: dataViewId },
          query: { match_phrase: { 'service.name': 'checkout' } },
        },
        {
          meta: { index: 'other-data-view' },
          query: { match_phrase: { 'service.name': 'payments' } },
        },
      ],
    },
  };

  return {
    id,
    label: id,
    sort: [],
    columns: [],
    grid: {},
    hideChart: false,
    hideTable: false,
    isTextBasedQuery: false,
    usesAdHocDataView: true,
    serializedSearchSource: {
      index: { id: dataViewId, title: 'logs-*' },
      query: { language: 'kuery', query: '' },
      filter: [combinedFilter],
    },
  };
};

describe('Discover session serialization', () => {
  it('preserves shared and independent inline IDs, nested filters and pins without mutation', () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        createTab('first', sharedDataViewId),
        createTab('second', sharedDataViewId),
        createTab('independent', independentDataViewId),
      ],
    });
    const beforeSerialization = cloneDeep(session);
    const stored = serializeDiscoverSession(session);
    const beforeDeserialization = cloneDeep(stored);

    expect(
      stored.attributes.tabs.map(({ attributes }) =>
        parseSearchSourceJSON(attributes.kibanaSavedObjectMeta.searchSourceJSON)
      )
    ).toEqual(
      [sharedDataViewId, sharedDataViewId, independentDataViewId].map((id) =>
        expect.objectContaining({ index: { id, title: 'logs-*' } })
      )
    );
    expect(stored.references).toEqual(
      session.tabs.map((tab, index) => ({
        name: `tab_${tab.id}.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index`,
        type: 'index-pattern',
        id: index === 2 ? independentDataViewId : sharedDataViewId,
      }))
    );

    const restored = deserializeDiscoverSession({ ...stored, id: session.id });

    expect(restored.tabs).toEqual(session.tabs);
    expect(session).toStrictEqual(beforeSerialization);
    expect(stored).toStrictEqual(beforeDeserialization);
  });

  it('preserves raw chart and control state, tab settings, metadata and all read references', () => {
    const tab: Required<DiscoverSessionTab> = {
      ...createTab('chart', sharedDataViewId),
      usesAdHocDataView: true,
      sort: [['@timestamp', 'desc']],
      columns: ['message'],
      grid: { columns: { message: { width: 200 } } },
      hideAggregatedPreview: true,
      rowHeight: 2,
      headerRowHeight: 3,
      rowsPerPage: 50,
      sampleSize: 500,
      breakdownField: 'service.name',
      chartInterval: 'auto',
      timeRestore: false,
      timeRange: { from: 'now-15m', to: 'now' },
      refreshInterval: { pause: true, value: 1000 },
      esqlApproximation: false,
      viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      density: DataGridDensity.EXPANDED,
      documentsDisplayMode: 'json',
      jsonModeSettings: { hideNulls: true, wrapLines: false, defaultRenderedNodes: 20 },
      visContext: {
        attributes: { visualizationType: 'lnsXY', state: { adHocDataViews: {} } },
        requestData: { dataViewId: sharedDataViewId, timeInterval: 'auto' },
        suggestionType: 'histogram',
      },
      controlGroupJson:
        '{"last":{"type":"esqlControl","order":2},"first":{"type":"custom","order":0}}',
      tabTypeState: {
        type: DiscoverTabType.Metrics,
        dimensions: ['host.name'],
        searchTerm: 'cpu',
        counterAggregation: 'max',
        gaugeAggregation: 'avg',
        histogramPercentile: 'p99',
      },
    };
    const session = createDiscoverSessionMock({
      id: 'resolved-id',
      tabs: [tab, { ...createTab('cleared-chart', sharedDataViewId), visContext: {} }],
    });
    const stored = serializeDiscoverSession(session);
    const sharingSavedObjectProps = {
      outcome: 'aliasMatch' as const,
      aliasTargetId: session.id,
      aliasPurpose: 'savedObjectConversion' as const,
    };
    stored.references.push({ id: 'unmapped', type: 'custom', name: 'original-reference-name' });
    const restored = deserializeDiscoverSession({
      ...stored,
      id: session.id,
      managed: true,
      sharingSavedObjectProps,
    });

    expect(restored).toEqual({
      ...session,
      references: stored.references,
      managed: true,
      sharingSavedObjectProps,
    });
  });

  it('preserves tag availability, duplicate tags and reference order', () => {
    const tags = ['second-tag', 'first-tag', 'second-tag'];
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tags,
      tabs: [createTab('first', sharedDataViewId)],
    });
    const updateTagsReferences: DiscoverSessionTagging['updateTagsReferences'] = (
      references,
      tagIds
    ) => {
      return [...references, ...tagIds.map((id) => ({ id, type: 'tag', name: `tag-ref-${id}` }))];
    };
    const getTagIdsFromReferences: DiscoverSessionTagging['getTagIdsFromReferences'] = (
      references
    ) => references.filter(({ type }) => type === 'tag').map(({ id }) => id);
    const tagging = {
      updateTagsReferences: jest.fn(updateTagsReferences),
      getTagIdsFromReferences: jest.fn(getTagIdsFromReferences),
    };
    const withoutTagging = serializeDiscoverSession(session);
    const withTagging = serializeDiscoverSession(session, tagging);

    expect(tagging.updateTagsReferences).toHaveBeenCalledWith(withoutTagging.references, tags);
    expect(withTagging.references.map(({ id }) => id)).toEqual([sharedDataViewId, ...tags]);
    expect(deserializeDiscoverSession({ ...withTagging, id: session.id }).tags).toBeUndefined();
    expect(deserializeDiscoverSession({ ...withTagging, id: session.id }, tagging).tags).toEqual(
      session.tags
    );
    expect(deserializeDiscoverSession({ ...withoutTagging, id: session.id }).managed).toBe(false);
  });

  it('uses the same stored representation for the existing CM save and load adapters', async () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createTab('first', sharedDataViewId)],
    });
    const { id: _id, ...newSession } = session;
    const stored = serializeDiscoverSession(newSession);
    const contentManagement = contentManagementMock.createStartContract().client;
    contentManagement.create = jest.fn().mockResolvedValue({ item: { id: session.id } });

    const saved = await saveDiscoverSession(newSession, {}, contentManagement, undefined);

    expect(contentManagement.create).toHaveBeenCalledWith({
      contentTypeId: 'search',
      data: stored.attributes,
      options: { references: stored.references },
    });
    expect(saved).toEqual({ ...newSession, id: session.id, references: stored.references });

    const sharingSavedObjectProps = { outcome: 'aliasMatch' as const, aliasTargetId: session.id };
    const getSavedSrch = jest.fn().mockResolvedValue({
      item: { ...stored, id: session.id, managed: true },
      meta: sharingSavedObjectProps,
    });
    const loaded = await getDiscoverSession('legacy-id', {
      getSavedSrch,
      searchSourceCreate: jest.fn(),
    });

    expect(getSavedSrch).toHaveBeenCalledWith('legacy-id');
    expect(loaded).toEqual(
      deserializeDiscoverSession({
        ...stored,
        id: session.id,
        managed: true,
        sharingSavedObjectProps,
      })
    );
  });
});

const savedSharingProps: DiscoverSession['sharingSavedObjectProps'] = {
  outcome: 'aliasMatch',
  aliasTargetId: 'session-id',
  aliasPurpose: 'savedObjectConversion',
};

describe('serializeDiscoverSession', () => {
  it('extracts search source references and keeps inline Data View IDs', () => {
    expect(serializeDiscoverSession(discoverSession)).toEqual(storedDiscoverSession);
  });

  it('keeps an ES|QL tab without references', () => {
    const esqlSearchSource = {
      query: { esql: 'FROM logs-*' },
      index: { id: 'esql-view-id', title: 'logs-*', type: 'esql' },
    };

    expect(
      serializeDiscoverSession({
        title: 'ES|QL session',
        description: '',
        tabs: [
          {
            id: 'esql-tab',
            label: 'ES|QL',
            sort: [],
            columns: [],
            grid: {},
            hideChart: false,
            hideTable: false,
            isTextBasedQuery: true,
            serializedSearchSource: esqlSearchSource,
          },
        ],
      })
    ).toEqual<StoredDiscoverSession>({
      attributes: {
        title: 'ES|QL session',
        description: '',
        tabs: [
          {
            id: 'esql-tab',
            label: 'ES|QL',
            attributes: {
              sort: [],
              columns: [],
              grid: {},
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: true,
              kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(esqlSearchSource) },
            },
          },
        ],
      },
      references: [],
    });
  });
});

describe('deserializeDiscoverSession', () => {
  it('restores references, inline Data View IDs and saved object metadata', () => {
    expect(
      deserializeDiscoverSession({
        ...storedDiscoverSession,
        id: 'session-id',
        managed: true,
        sharingSavedObjectProps: savedSharingProps,
      })
    ).toEqual<DiscoverSession>({
      ...discoverSession,
      id: 'session-id',
      managed: true,
      references: storedDiscoverSession.references,
      sharingSavedObjectProps: savedSharingProps,
    });
  });

  it('keeps inline filter IDs that are stored in the search source', () => {
    const searchSource = {
      index: { id: 'inline-view-id', title: 'logs-*' },
      filter: [{ meta: { index: 'inline-view-id' }, query: { exists: { field: 'host.name' } } }],
    };

    const session = deserializeDiscoverSession({
      id: 'session-id',
      attributes: {
        title: 'API session',
        description: '',
        tabs: [
          {
            id: 'tab',
            label: 'Tab',
            attributes: {
              sort: [],
              columns: [],
              grid: {},
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: false,
              kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSource) },
            },
          },
        ],
      },
      references: [],
    });

    expect(session.tabs[0].serializedSearchSource).toEqual(searchSource);
    expect(session.managed).toBe(false);
    expect(session).not.toHaveProperty('tags');
  });
});
