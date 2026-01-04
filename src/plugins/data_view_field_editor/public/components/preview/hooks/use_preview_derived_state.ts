/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import type { Context, FieldPreview, Params } from '../types';

interface ScriptEditorValidationState {
  isValidating: boolean;
  isValid: boolean;
  message: string | null;
}

interface Args {
  previewResponse: { fields: Context['fields']; error: Context['error'] };
  scriptEditorValidation: ScriptEditorValidationState;
  params: Params;
  currentDocumentSource?: Record<string, unknown>;
  valueFormatter: (value: unknown) => string;

  allParamsDefined: boolean;
  hasSomeParamsChanged: boolean;
  isLoadingPreviewInFlight: boolean;

  isFetchingDocumentInFlight: boolean;
  isCustomDocId: boolean;
  customDocIdToLoad: string | null;
  totalDocs: number;
}

export const usePreviewDerivedState = ({
  previewResponse,
  scriptEditorValidation,
  params,
  currentDocumentSource,
  valueFormatter,
  allParamsDefined,
  hasSomeParamsChanged,
  isLoadingPreviewInFlight,
  isFetchingDocumentInFlight,
  isCustomDocId,
  customDocIdToLoad,
  totalDocs,
}: Args) => {
  const { name, type, script, parentName } = params;

  const isCustomDocIdPending = useMemo(
    () => customDocIdToLoad !== null && Boolean(customDocIdToLoad.trim()),
    [customDocIdToLoad]
  );

  // If no documents could be fetched from the cluster (and we are not trying to load
  // a custom doc ID) then we disable preview as the script field validation expect the result
  // of the preview to before resolving. If there are no documents we can't have a preview
  // (the _execute API expects one) and thus the validation should not expect a value.
  const isPreviewAvailable = useMemo(() => {
    if (!isFetchingDocumentInFlight && !isCustomDocId && totalDocs === 0) {
      return false;
    }
    return true;
  }, [isFetchingDocumentInFlight, isCustomDocId, totalDocs]);

  const syntaxError: Context['error'] = useMemo(() => {
    if (scriptEditorValidation.isValidating) {
      return null;
    }

    if (scriptEditorValidation.isValid === false && script?.source !== undefined) {
      return {
        code: 'PAINLESS_SYNTAX_ERROR',
        error: {
          reason:
            scriptEditorValidation.message ??
            i18n.translate('indexPatternFieldEditor.fieldPreview.error.painlessSyntax', {
              defaultMessage: 'Invalid Painless syntax',
            }),
        },
      };
    }

    return null;
  }, [scriptEditorValidation, script?.source]);

  const error: Context['error'] = useMemo(() => {
    if (script?.source === undefined) {
      return null;
    }

    return syntaxError ?? previewResponse.error;
  }, [previewResponse.error, syntaxError, script?.source]);

  const fields: Context['fields'] = useMemo(() => {
    const executeFields = previewResponse.fields;

    // If the user has entered a name but not yet any script we will display
    // the field in the preview with just the name
    if (executeFields.length === 0 && name !== null) {
      return [{ key: name, value: undefined, formattedValue: undefined, type: undefined }];
    }

    return executeFields.map((field) => {
      // Keep the key in sync with the current name when editing a composite field
      let key = name ?? '';
      if (type === 'composite') {
        // restore initial key segement (the parent name), which was not returned
        const { 1: fieldName } = field.key.split('.');
        key = `${name ?? ''}.${fieldName}`;
      }

      const nextValue =
        script === null && Boolean(currentDocumentSource)
          ? get(currentDocumentSource, name ?? '') // When there is no script we try to read the value from _source
          : field?.value;

      const formattedValue = valueFormatter(nextValue);

      const nextField: FieldPreview = {
        ...field,
        key,
        value: nextValue,
        formattedValue,
      };

      return nextField;
    });
  }, [previewResponse.fields, name, type, script, currentDocumentSource, valueFormatter]);

  const isLoadingPreviewPending =
    Boolean(parentName) === false &&
    allParamsDefined &&
    hasSomeParamsChanged &&
    scriptEditorValidation.isValidating === false &&
    scriptEditorValidation.isValid;

  const isLoadingPreview = isLoadingPreviewInFlight || isLoadingPreviewPending;
  const isFetchingDocument = isFetchingDocumentInFlight || isCustomDocIdPending;

  return {
    fields,
    error,
    isPreviewAvailable,
    isLoadingPreview,
    isFetchingDocument,
    isCustomDocIdPending,
  };
};
