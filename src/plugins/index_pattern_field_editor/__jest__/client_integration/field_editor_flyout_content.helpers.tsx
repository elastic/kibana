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
  // Add TS overload function types
  function getRenderedIndexPatternFields(returnWrappers?: boolean): ReactWrapper;
  function getRenderedIndexPatternFields(
    returnWrappers?: boolean
  ): Array<{ key: string; value: string }>;

  function getRenderedIndexPatternFields(returnWrappers = false) {
    if (testBed.find('indexPatternFieldList').length === 0) {
      return [];
    }

    const allFields = testBed.find('indexPatternFieldList.listItem');

    if (returnWrappers === true) {
      return allFields;
    }

    return allFields.map((field) => {
      const key = testBed.find('key', field).text();
      const value = testBed.find('value', field).text();
      return { key, value };
    });
  }

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
      if (
        request.method === 'POST' &&
        request.url === '/api/index_pattern_field_editor/field_preview'
      ) {
        return {
          ...request,
          requestBody: JSON.parse(JSON.parse(request.requestBody).body),
        };
      }
      i--;
    }

    throw new Error(`Can't access the latest preview http request as it hasn't been called.`);
  };

  return {
    ...getCommonActions(testBed),
    getRenderedIndexPatternFields,
    getRenderedFieldsPreview,
    setFilterFieldsValue,
    getLatestPreviewHttpRequest,
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
