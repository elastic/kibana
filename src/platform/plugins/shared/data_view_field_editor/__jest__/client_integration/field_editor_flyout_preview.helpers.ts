/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserEvent } from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { Context } from '../../public/components/field_editor_context';
import type { Props } from '../../public/components/field_editor_flyout_content';
import type { TestDoc } from './helpers';
import {
  createRtlHelpers,
  flushDocumentsAndPreviewTimers,
  flushPreviewAndSearchTimers,
  setupFieldEditorFlyout,
} from './helpers/rtl_helpers';
import { FIELD_PREVIEW_PATH } from '../../common/constants';
import { spyIndexPatternGetByName, spySearchQuery, spySearchQueryResponse } from './helpers';

const defaultProps: Props = {
  onCancel: jest.fn(),
  onSave: jest.fn(),
};

/**
 * This handler lets us mock the fields present on the index pattern during our test
 * @param fields The fields of the index pattern
 */
export const setIndexPatternFields = (fields: Array<{ name: string; displayName: string }>) => {
  spyIndexPatternGetByName.mockReturnValue(fields);
};

export const getSearchCallMeta = () => {
  const totalCalls = spySearchQuery.mock.calls.length;
  const lastCall = spySearchQuery.mock.calls[totalCalls - 1] ?? null;
  const lastCallParams = lastCall ? lastCall[0] : null;

  return {
    lastCall,
    lastCallParams,
    totalCalls,
  };
};

export const setSearchResponse = (
  documents: Array<{ _id: string; _index: string; fields: TestDoc }>
) => {
  spySearchQueryResponse.mockResolvedValue({
    rawResponse: {
      hits: {
        hits: documents,
        total: documents.length,
      },
    },
  });
};

const getTypeValueFromLabel = (label: string) => label.toLowerCase().replaceAll(' ', '_');

const getActions = (user: UserEvent) => {
  const {
    createFieldEditorFields,
    getTextByTestSubjectPath,
    queryAllByTestSubjectPath,
    queryByTestSubjectPath,
    setInputValue,
    toggleFormRow,
  } = createRtlHelpers(user);

  const clearFieldSearch = async () => {
    const button = queryByTestSubjectPath('emptySearchResult.clearSearchButton');

    if (!button) throw new Error(`Unable to find clear search button.`);

    await user.click(button);
  };

  // Need to set "server: any" (instead of SinonFakeServer) to avoid a TS error :(
  // Error: Exported variable 'setup' has or is using name 'Document' from external module "/dev/shm/workspace/parallel/14/kibana/node_modules/@types/sinon/ts3.1/index"
  const getLatestPreviewHttpRequest = (server: any) => {
    let i = server.requests.length - 1;

    while (i >= 0) {
      const request = server.requests[i];

      if (request.method === 'POST' && request.url === FIELD_PREVIEW_PATH) {
        return {
          ...request,
          requestBody: JSON.parse(JSON.parse(request.requestBody).body),
        };
      }
      i--;
    }

    throw new Error(`Can't access the latest preview HTTP request as it hasn't been called.`);
  };

  const getRenderedFieldsPreview = () => {
    if (screen.queryAllByTestId('fieldPreviewItem').length === 0) return [];

    const previewFields = queryAllByTestSubjectPath('fieldPreviewItem.listItem');

    return previewFields.map((field) => {
      const key = getTextByTestSubjectPath('key', field);
      const value = getTextByTestSubjectPath('value', field);

      return { key, value };
    });
  };

  const getRenderedIndexPatternFieldElements = () => {
    if (screen.queryAllByTestId('indexPatternFieldList').length === 0) return null;

    return queryAllByTestSubjectPath('indexPatternFieldList.listItem');
  };

  const getRenderedIndexPatternFields = () => {
    const allFields = getRenderedIndexPatternFieldElements();

    if (allFields === null) return [];

    return allFields.map((field) => {
      const key = getTextByTestSubjectPath('key', field);
      const value = getTextByTestSubjectPath('value', field);

      return { key, value };
    });
  };

  const goToNextDocument = async () => {
    const button = queryByTestSubjectPath('goToNextDocButton');

    if (!button) throw new Error(`Unable to find next document button.`);

    await user.click(button);
    await flushPreviewAndSearchTimers();
  };

  const goToPreviousDocument = async () => {
    const button = queryByTestSubjectPath('goToPrevDocButton');

    if (!button) throw new Error(`Unable to find previous document button.`);

    await user.click(button);
    await flushPreviewAndSearchTimers();
  };

  const loadDocumentsFromCluster = async () => {
    const button = queryByTestSubjectPath('loadDocsFromClusterButton');

    if (!button) throw new Error(`Unable to find load documents from cluster button.`);

    await user.click(button);
    await flushPreviewAndSearchTimers();
  };

  const pinFieldAt = async (index: number) => {
    const field = getRenderedIndexPatternFieldElements()?.[index];
    const button = field ? queryByTestSubjectPath('pinFieldButton', field) : undefined;

    if (!button) throw new Error(`Unable to find pin button for field at index ${index}.`);

    await user.click(button);
  };

  const setDocumentId = async (docId: string) => {
    await setInputValue('documentIdField', docId);
    await flushPreviewAndSearchTimers();
  };

  const setFilterFieldsValue = async (value: string) => {
    await setInputValue('filterFieldsInput', value);
  };

  const updateFormat = async (value: string) => {
    const select = queryByTestSubjectPath('editorSelectedFormatId');

    if (!select) throw new Error(`Unable to find format field.`);

    await user.selectOptions(select, value);
  };

  const loadCustomDocument = setDocumentId;
  const fields = createFieldEditorFields({
    getTypeValue: getTypeValueFromLabel,
  });

  return {
    clearFieldSearch,
    fields: {
      updateFormat,
      ...fields,
    },
    flushDocumentsAndPreviewTimers,
    flushPreviewAndSearchTimers,
    getLatestPreviewHttpRequest,
    getRenderedFieldsPreview,
    getRenderedIndexPatternFieldElements,
    getRenderedIndexPatternFields,
    goToNextDocument,
    goToPreviousDocument,
    loadCustomDocument,
    loadDocumentsFromCluster,
    pinFieldAt,
    setDocumentId,
    setFilterFieldsValue,
    toggleFormRow,
  };
};

export const setup = async (props?: Partial<Props>, deps?: Partial<Context>) => {
  const { user } = await setupFieldEditorFlyout(props, deps, defaultProps);
  const actions = getActions(user);

  return {
    actions,
  };
};
