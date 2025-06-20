/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useActiveProfiles } from './use_active_profiles';
import { DiscoverTestProvider } from '../../../__mocks__/test_provider';
import React from 'react';
import type { DataDocumentsMsg } from '../state_management/discover_data_state_container';
import { FetchStatus } from '../../types';
import { getDataTableRecordMock } from '@kbn/discover-utils/src/__mocks__';
import { BehaviorSubject } from 'rxjs';
import type { ScopedProfilesManager } from '../../../context_awareness';

const getDataDocumentMsgMock = (): DataDocumentsMsg => {
  return {
    fetchStatus: FetchStatus.COMPLETE,
    result: [getDataTableRecordMock()],
  };
};

const getDataTableRecordWithContextMock = (profileId: string = 'test-profile-id') => {
  const record = getDataTableRecordMock();
  return {
    ...record,
    context: {
      profileId,
      contextType: 'document',
      name: 'Test Document',
    },
  };
};

const rootContextMock = {
  profileId: 'root-profile-id',
  contextType: 'root',
  name: 'Test Root',
} as const;

const dataSourceContextMock = {
  profileId: 'datasource-profile-id',
  contextType: 'datasource',
  name: 'Test Data Source',
} as const;

const defaultRootContextMock = {
  profileId: 'default-root-profile-id',
  contextType: 'root',
  name: 'Default Root',
} as const;

const defaultDataSourceContextMock = {
  profileId: 'default-datasource-profile-id',
  contextType: 'datasource',
  name: 'Default Data Source',
} as const;

const getScopedProfilesManagerMock = (withContexts = false) => {
  return {
    getContexts$: () => ({
      rootContext$: {
        getValue: () => (withContexts ? rootContextMock : defaultRootContextMock),
      },
      dataSourceContext$: {
        getValue: () => (withContexts ? dataSourceContextMock : defaultDataSourceContextMock),
      },
    }),
  } as unknown as ScopedProfilesManager;
};

const setup = (attrs: {
  hookAttrs?: Parameters<typeof useActiveProfiles>[0];
  scopedProfilesManager?: Parameters<typeof DiscoverTestProvider>[0]['scopedProfilesManager'];
}) => {
  const documents$ =
    attrs.hookAttrs?.dataDocuments$ || new BehaviorSubject(getDataDocumentMsgMock());

  return renderHook(() => useActiveProfiles({ dataDocuments$: documents$ }), {
    wrapper: ({ children }) => (
      <DiscoverTestProvider
        scopedProfilesManager={attrs.scopedProfilesManager || getScopedProfilesManagerMock()}
      >
        {children}
      </DiscoverTestProvider>
    ),
  });
};

describe('useActiveProfiles', () => {
  it('should return default root and dataSource contexts when not explicitly provided', () => {
    const { result } = setup({});

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });

    expect(adapter.getRootProfile()).toEqual(defaultRootContextMock);
    expect(adapter.getDataSourceProfile()).toEqual(defaultDataSourceContextMock);
    expect(adapter.getDocumentsProfiles()).toEqual({});
  });

  it('should return root and dataSource contexts when provided', () => {
    const { result } = setup({
      scopedProfilesManager: getScopedProfilesManagerMock(true),
    });

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });

    expect(adapter.getRootProfile()).toEqual(rootContextMock);
    expect(adapter.getDataSourceProfile()).toEqual(dataSourceContextMock);
  });

  it('should process documents with context and group them by profile ID', () => {
    const documentWithContext1 = getDataTableRecordWithContextMock('profile-1');
    const documentWithContext2 = getDataTableRecordWithContextMock('profile-1');
    const documentWithContext3 = getDataTableRecordWithContextMock('profile-2');

    const documentsSubject = new BehaviorSubject<DataDocumentsMsg>({
      fetchStatus: FetchStatus.COMPLETE,
      result: [documentWithContext1, documentWithContext2, documentWithContext3],
    });

    const { result } = setup({
      hookAttrs: { dataDocuments$: documentsSubject },
    });

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });
    const profiles = adapter.getDocumentsProfiles();

    expect(Object.keys(profiles)).toHaveLength(2);
    expect(profiles['profile-1']).toHaveLength(2);
    expect(profiles['profile-2']).toHaveLength(1);
    expect(profiles['profile-1']).toContain(documentWithContext1);
    expect(profiles['profile-1']).toContain(documentWithContext2);
    expect(profiles['profile-2']).toContain(documentWithContext3);
  });

  it('should ignore documents without context', () => {
    const documentWithContext = getDataTableRecordWithContextMock();
    const documentWithoutContext = getDataTableRecordMock();

    const documentsSubject = new BehaviorSubject<DataDocumentsMsg>({
      fetchStatus: FetchStatus.COMPLETE,
      result: [documentWithContext, documentWithoutContext],
    });

    const { result } = setup({
      hookAttrs: { dataDocuments$: documentsSubject },
    });

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });
    const profiles = adapter.getDocumentsProfiles();

    expect(Object.keys(profiles)).toHaveLength(1);
    expect(profiles['test-profile-id']).toHaveLength(1);
    expect(profiles['test-profile-id']).toContain(documentWithContext);
  });

  it('should call onOpenDocDetails when openDocDetails is called', () => {
    const { result } = setup({});

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });

    const mockRecord = getDataTableRecordMock();
    adapter.openDocDetails(mockRecord);

    expect(onOpenDocDetails).toHaveBeenCalledWith(mockRecord);
  });
});
