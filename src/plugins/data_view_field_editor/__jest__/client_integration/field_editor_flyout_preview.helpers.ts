/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

import { API_BASE_PATH } from '../../common/constants';
import { Context } from '../../public/components/field_editor_context';
import {
  FieldEditorFlyoutContent,
  Props,
} from '../../public/components/field_editor_flyout_content';
import {
  WithFieldEditorDependencies,
  getCommonActions,
  spyIndexPatternGetAllFields,
  spySearchQuery,
  spySearchQueryResponse,
  TestDoc,
} from './helpers';

const defaultProps: Props = {
  onSave: () => {},
  onCancel: () => {},
  isSavingField: false,
};

/**
 * This handler lets us mock the fields present on the index pattern during our test
 * @param fields The fields of the index pattern
 */
export const setIndexPatternFields = (fields: Array<{ name: string; displayName: string }>) => {
  spyIndexPatternGetAllFields.mockReturnValue(fields);
};

export const getSearchCallMeta = () => {
  const totalCalls = spySearchQuery.mock.calls.length;
  const lastCall = spySearchQuery.mock.calls[totalCalls - 1] ?? null;
  let lastCallParams = null;

  if (lastCall) {
    lastCallParams = lastCall[0];
  }

  return {
    totalCalls,
    lastCall,
    lastCallParams,
  };
};

export const setSearchResponse = (
  documents: Array<{ _id: string; _index: string; _source: TestDoc }>
) => {
  spySearchQueryResponse.mockResolvedValue({
    rawResponse: {
      hits: {
        total: documents.length,
        hits: documents,
      },
    },
  });
};

const getActions = (testBed: TestBed) => {
  const getWrapperRenderedIndexPatternFields = (): ReactWrapper | null => {
    if (testBed.find('indexPatternFieldList').length === 0) {
      return null;
    }
    return testBed.find('indexPatternFieldList.listItem');
  };

  const getRenderedIndexPatternFields = (): Array<{ key: string; value: string }> => {
    const allFields = getWrapperRenderedIndexPatternFields();

    if (allFields === null) {
      return [];
    }

    return allFields.map((field) => {
      const key = testBed.find('key', field).text();
      const value = testBed.find('value', field).text();
      return { key, value };
    });
  };

  const getRenderedFieldsPreview = () => {
    if (testBed.find('fieldPreviewItem').length === 0) {
      return [];
    }

    const previewFields = testBed.find('fieldPreviewItem.listItem');

    return previewFields.map((field) => {
      const key = testBed.find('key', field).text();
      const value = testBed.find('value', field).text();
      return { key, value };
    });
  };

  const setFilterFieldsValue = async (value: string) => {
    await act(async () => {
      testBed.form.setInputValue('filterFieldsInput', value);
    });

    testBed.component.update();
  };

  // Need to set "server: any" (instead of SinonFakeServer) to avoid a TS error :(
  // Error: Exported variable 'setup' has or is using name 'Document' from external module "/dev/shm/workspace/parallel/14/kibana/node_modules/@types/sinon/ts3.1/index"
  const getLatestPreviewHttpRequest = (server: any) => {
    let i = server.requests.length - 1;

    while (i >= 0) {
      const request = server.requests[i];
      if (request.method === 'POST' && request.url === `${API_BASE_PATH}/field_preview`) {
        return {
          ...request,
          requestBody: JSON.parse(JSON.parse(request.requestBody).body),
        };
      }
      i--;
    }

    throw new Error(`Can't access the latest preview HTTP request as it hasn't been called.`);
  };

  const goToNextDocument = async () => {
    await act(async () => {
      testBed.find('goToNextDocButton').simulate('click');
    });
    testBed.component.update();
  };

  const goToPreviousDocument = async () => {
    await act(async () => {
      testBed.find('goToPrevDocButton').simulate('click');
    });
    testBed.component.update();
  };

  const loadCustomDocument = (docId: string) => {};

  return {
    ...getCommonActions(testBed),
    getWrapperRenderedIndexPatternFields,
    getRenderedIndexPatternFields,
    getRenderedFieldsPreview,
    setFilterFieldsValue,
    getLatestPreviewHttpRequest,
    goToNextDocument,
    goToPreviousDocument,
    loadCustomDocument,
  };
};

export const setup = async (props?: Partial<Props>, deps?: Partial<Context>) => {
  let testBed: TestBed;

  // Setup testbed
  await act(async () => {
    testBed = await registerTestBed(WithFieldEditorDependencies(FieldEditorFlyoutContent, deps), {
      memoryRouter: {
        wrapComponent: false,
      },
    })({ ...defaultProps, ...props });
  });

  testBed!.component.update();

  return { ...testBed!, actions: getActions(testBed!) };
};

export type FieldEditorFlyoutContentTestBed = TestBed & { actions: ReturnType<typeof getActions> };
