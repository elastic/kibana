/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { SinonFakeServer } from 'sinon';
import { registerTestBed, TestBed } from '@kbn/test/jest';

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
} from './helpers';

const defaultProps: Props = {
  onSave: () => {},
  onCancel: () => {},
  runtimeFieldValidator: () => Promise.resolve(null),
  isSavingField: false,
};

export const setIndexPatternFields = (fields: Array<{ name: string; displayName: string }>) => {
  spyIndexPatternGetAllFields.mockReturnValue(fields);
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

  function getRenderedFieldsPreview() {
    if (testBed.find('fieldPreviewItem').length === 0) {
      return [];
    }

    const previewFields = testBed.find('fieldPreviewItem.listItem');

    return previewFields.map((field) => {
      const key = testBed.find('key', field).text();
      const value = testBed.find('value', field).text();
      return { key, value };
    });
  }

  const setFilterFieldsValue = async (value: string) => {
    await act(async () => {
      testBed.form.setInputValue('filterFieldsInput', value);
    });

    testBed.component.update();
  };

  const getLatestPreviewHttpRequest = (server: SinonFakeServer) => {
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
