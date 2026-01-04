/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { BehaviorSubject } from 'rxjs';

import { parseEsError } from '../../../lib/runtime_field_validation';
import type { DataView } from '../../../shared_imports';
import type { ApiService } from '../../../lib/api';
import type { EsDocument, FieldPreview, Params, PainlessExecuteContext } from '../types';
import { defaultValueFormatter, valueTypeToSelectedType } from '../utils/formatters';
import type { PreviewAction } from '../reducers';

const getExecuteContext = (args: {
  parentName: Params['parentName'];
  type: Params['type'];
}): PainlessExecuteContext | 'composite_field' => {
  if (args.parentName) {
    return 'composite_field';
  }

  return `${args.type!}_field` as PainlessExecuteContext;
};

const shouldDeferPreviewWhileValidating = (args: {
  parentName: Params['parentName'];
  scriptEditorValidation: ScriptEditorValidationState;
}): boolean => {
  // don't prevent rendering if we're working with a composite subfield (has parentName)
  return !args.parentName && args.scriptEditorValidation.isValidating;
};

const shouldSkipPreviewRequest = (args: {
  parentName: Params['parentName'];
  allParamsDefined: boolean;
  hasSomeParamsChanged: boolean;
  scriptEditorValidation: ScriptEditorValidationState;
}): boolean => {
  // Only gate requests for non-composite subfields. Composite subfields depend on the parent script.
  if (args.parentName) {
    return false;
  }

  return (
    !args.allParamsDefined ||
    !args.hasSomeParamsChanged ||
    args.scriptEditorValidation.isValid === false
  );
};

interface ToastsLike {
  addError: (error: Error, options: { title: string }) => unknown;
}

interface ScriptEditorValidationState {
  isValidating: boolean;
  isValid: boolean;
  message: string | null;
}

interface Args {
  name: string | null;
  type: Params['type'];
  script: Params['script'];
  parentName: Params['parentName'];

  dataView: DataView;
  getFieldPreview: ApiService['getFieldPreview'];
  toasts: ToastsLike;

  currentDocIndex?: string;
  currentDocId?: string;
  currentDocument?: EsDocument;

  allParamsDefined: boolean;
  hasSomeParamsChanged: boolean;
  scriptEditorValidation: ScriptEditorValidationState;

  fieldName$: BehaviorSubject<string>;
  fieldPreview$: BehaviorSubject<FieldPreview[] | undefined>;

  valueFormatter: (value: unknown) => string;
  previewDispatch: React.Dispatch<PreviewAction>;
  previewCount: React.MutableRefObject<number>;
  lastExecutePainlessRequestParams: React.MutableRefObject<{
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  }>;
}

export const usePreviewExecution = ({
  name,
  type,
  script,
  parentName,
  dataView,
  getFieldPreview,
  toasts,
  currentDocIndex,
  currentDocId,
  currentDocument,
  allParamsDefined,
  hasSomeParamsChanged,
  scriptEditorValidation,
  fieldName$,
  fieldPreview$,
  valueFormatter,
  previewDispatch,
  previewCount,
  lastExecutePainlessRequestParams,
}: Args) => {
  const setLoadingInFlight = useCallback(
    (next: boolean) => {
      previewDispatch({ type: 'SET_LOADING_IN_FLIGHT', isLoadingPreviewInFlight: next });
    },
    [previewDispatch]
  );

  const updateSingleFieldPreview = useCallback(
    (fieldName: string, values: unknown[]) => {
      const [value] = values;
      const formattedValue = valueFormatter(value);

      previewDispatch({
        type: 'SET_PREVIEW_RESPONSE',
        previewResponse: {
          fields: [{ key: fieldName, value, formattedValue }],
          error: null,
        },
      });
    },
    [valueFormatter, previewDispatch]
  );

  const updateCompositeFieldPreview = useCallback(
    (compositeValues: Record<string, unknown[]>) => {
      const basePrefix = parentName ? `${parentName}.` : `${fieldName$.getValue() ?? ''}.`;
      const expectedSubfieldKey = parentName ? name : null;

      const fields = Object.entries(compositeValues)
        .map<FieldPreview>(([key, values]) => {
          // The Painless _execute API returns the composite field values under a map.
          // Each of the key is prefixed with "composite_field." (e.g. "composite_field.field1: ['value']")
          const { 1: fieldName } = key.split('composite_field.');

          const [value] = values;
          const formattedValue = valueFormatter(value);

          return {
            key: `${basePrefix}${fieldName}`,
            value,
            formattedValue,
            type: valueTypeToSelectedType(value),
          };
        })
        .filter((field) => (expectedSubfieldKey ? field.key === expectedSubfieldKey : true))
        // ...and sort alphabetically
        .sort((a, b) => a.key.localeCompare(b.key));

      fieldPreview$.next(fields);
      previewDispatch({
        type: 'SET_PREVIEW_RESPONSE',
        previewResponse: { fields, error: null },
      });
    },
    [valueFormatter, parentName, name, fieldPreview$, fieldName$, previewDispatch]
  );

  const updatePreview = useCallback(async () => {
    if (shouldDeferPreviewWhileValidating({ parentName, scriptEditorValidation })) {
      return;
    }

    if (
      shouldSkipPreviewRequest({
        parentName,
        allParamsDefined,
        hasSomeParamsChanged,
        scriptEditorValidation,
      })
    ) {
      setLoadingInFlight(false);
      return;
    }

    if (!currentDocIndex || !currentDocId || !currentDocument?._source || !script) {
      setLoadingInFlight(false);
      return;
    }

    lastExecutePainlessRequestParams.current = {
      type,
      script: script.source,
      documentId: currentDocId,
    };

    const currentApiCall = ++previewCount.current;

    const previewScript = (parentName && dataView.getRuntimeField(parentName)?.script) || script;

    setLoadingInFlight(true);

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: currentDocument._source,
      context: getExecuteContext({ parentName, type }) as PainlessExecuteContext,
      script: previewScript,
    });

    if (currentApiCall !== previewCount.current) {
      // Discard this response as there is another one inflight
      // or we have called reset() and no longer need the response.
      return;
    }

    const { error: serverError } = response;

    if (serverError) {
      // Server error (not an ES error)
      const title = i18n.translate('indexPatternFieldEditor.fieldPreview.errorTitle', {
        defaultMessage: 'Failed to load field preview',
      });
      toasts.addError(serverError, { title });

      setLoadingInFlight(false);
      return;
    }

    if (response.data) {
      const { values, error } = response.data;

      if (error) {
        previewDispatch({
          type: 'SET_PREVIEW_RESPONSE',
          previewResponse: {
            fields: [
              {
                key: name ?? '',
                value: '',
                formattedValue: defaultValueFormatter(''),
              },
            ],
            error: { code: 'PAINLESS_SCRIPT_ERROR', error: parseEsError(error) },
          },
        });
      } else {
        if (!Array.isArray(values)) {
          updateCompositeFieldPreview(values);
        } else {
          updateSingleFieldPreview(name!, values);
        }
      }
    }

    previewDispatch({ type: 'SET_INITIAL_PREVIEW_COMPLETE', initialPreviewComplete: true });
    setLoadingInFlight(false);
  }, [
    parentName,
    scriptEditorValidation,
    allParamsDefined,
    hasSomeParamsChanged,
    currentDocIndex,
    currentDocId,
    currentDocument?._source,
    script,
    lastExecutePainlessRequestParams,
    type,
    previewCount,
    dataView,
    setLoadingInFlight,
    getFieldPreview,
    previewDispatch,
    toasts,
    name,
    updateCompositeFieldPreview,
    updateSingleFieldPreview,
  ]);

  return { updatePreview };
};
