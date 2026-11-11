/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession } from '../types';
import { discoverSession, storedDiscoverSession } from './discover_session.fixtures';
import {
  deserializeDiscoverSession,
  serializeDiscoverSession,
  type StoredDiscoverSession,
} from './discover_session_serialization';

const sharingSavedObjectProps: DiscoverSession['sharingSavedObjectProps'] = {
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
        sharingSavedObjectProps,
      })
    ).toEqual<DiscoverSession>({
      ...discoverSession,
      id: 'session-id',
      managed: true,
      references: storedDiscoverSession.references,
      sharingSavedObjectProps,
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
