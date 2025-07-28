/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useActiveContexts } from './use_active_contexts';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import React from 'react';
import type { DataDocumentsMsg } from '../../application/main/state_management/discover_data_state_container';
import { FetchStatus } from '../../application/types';
import { getDataTableRecordMock } from '@kbn/discover-utils/src/__mocks__';
import { BehaviorSubject } from 'rxjs';
import {
  createContextAwarenessMocks,
  getDataTableRecordWithContextMock as _getDataTableRecordWithContextMock,
} from '../__mocks__';
import { DocumentType } from '../profiles';

const { profilesManagerMock, scopedEbtManagerMock } = createContextAwarenessMocks();

const getDataDocumentMsgMock = (): DataDocumentsMsg => {
  return {
    fetchStatus: FetchStatus.COMPLETE,
    result: [getDataTableRecordMock()],
  };
};

const getDataTableRecordWithContextMock = (profileId: string = 'test-profile-id') => {
  return _getDataTableRecordWithContextMock({
    context: {
      profileId,
      type: DocumentType.Default,
    },
  });
};

const setup = (attrs: { hookAttrs?: Parameters<typeof useActiveContexts>[0] } = {}) => {
  const documents$ =
    attrs.hookAttrs?.dataDocuments$ || new BehaviorSubject(getDataDocumentMsgMock());

  const scopedProfilesManager = profilesManagerMock.createScopedProfilesManager({
    scopedEbtManager: scopedEbtManagerMock,
  });

  const renderResults = renderHook(() => useActiveContexts({ dataDocuments$: documents$ }), {
    wrapper: ({ children }) => (
      <DiscoverTestProvider scopedProfilesManager={scopedProfilesManager}>
        {children}
      </DiscoverTestProvider>
    ),
  });

  return { ...renderResults, scopedProfilesManager };
};

describe('useActiveContexts', () => {
  it('should return root and dataSource contexts', () => {
    const { result, scopedProfilesManager } = setup();
    const { rootContext, dataSourceContext } = scopedProfilesManager.getContexts();

    const onOpenDocDetails = jest.fn();
    const adapter = result.current({ onOpenDocDetails });

    expect(adapter.getRootContext()).toEqual(rootContext);
    expect(adapter.getDataSourceContext()).toEqual(dataSourceContext);
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
    const contexts = adapter.getDocumentContexts();

    expect(Object.keys(contexts)).toHaveLength(2);
    expect(contexts['profile-1']).toHaveLength(2);
    expect(contexts['profile-2']).toHaveLength(1);
    expect(contexts['profile-1']).toContain(documentWithContext1);
    expect(contexts['profile-1']).toContain(documentWithContext2);
    expect(contexts['profile-2']).toContain(documentWithContext3);
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
    const contexts = adapter.getDocumentContexts();

    expect(Object.keys(contexts)).toHaveLength(1);
    expect(contexts['test-profile-id']).toHaveLength(1);
    expect(contexts['test-profile-id']).toContain(documentWithContext);
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
