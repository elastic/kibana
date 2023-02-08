/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  FunctionComponent,
} from 'react';
import { renderToString } from 'react-dom/server';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { RuntimePrimitiveTypes } from '../../shared_imports';
import { useStateSelector } from '../../state_utils';

import { parseEsError } from '../../lib/runtime_field_validation';
import { useFieldEditorContext } from '../field_editor_context';
import type { PainlessExecuteContext, Context, Params, FieldPreview, PreviewState } from './types';
import type { PreviewController } from './preview_controller';

const fieldPreviewContext = createContext<Context | undefined>(undefined);

const defaultParams: Params = {
  name: null,
  index: null,
  script: null,
  document: null,
  type: null,
  format: null,
  parentName: null,
};

export const defaultValueFormatter = (value: unknown) => {
  const content = typeof value === 'object' ? JSON.stringify(value) : String(value) ?? '-';
  return renderToString(<>{content}</>);
};

export const valueTypeToSelectedType = (value: unknown): RuntimePrimitiveTypes => {
  const valueType = typeof value;
  if (valueType === 'string') return 'keyword';
  if (valueType === 'number') return 'double';
  if (valueType === 'boolean') return 'boolean';
  return 'keyword';
};

const documentsSelector = (state: PreviewState) => {
  const currentDocument = state.documents[state.currentIdx];
  return {
    currentDocument,
    totalDocs: state.documents.length,
    currentDocIndex: currentDocument?._index,
    currentDocId: currentDocument?._id,
    currentIdx: state.currentIdx,
  };
};

const scriptEditorValidationSelector = (state: PreviewState) => state.scriptEditorValidation;
const isFetchingDocumentSelector = (state: PreviewState) => state.isFetchingDocument;
const customDocIdToLoadSelector = (state: PreviewState) => state.customDocIdToLoad;
const fetchDocErrorSelector = (state: PreviewState) => state.fetchDocError;

export const FieldPreviewProvider: FunctionComponent<{ controller: PreviewController }> = ({
  controller,
  children,
}) => {
  const {
    dataView,
    fieldTypeToProcess,
    services: {
      notifications,
      api: { getFieldPreview },
    },
    fieldName$,
  } = useFieldEditorContext();

  const fieldPreview$ = useRef(new BehaviorSubject<FieldPreview[] | undefined>(undefined));

  const [initialPreviewComplete, setInitialPreviewComplete] = useState(false);

  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);

  /** Flag to show/hide the preview panel */
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  const { currentDocument, currentDocIndex, currentDocId, totalDocs, currentIdx } =
    useStateSelector(controller.state$, documentsSelector);
  const scriptEditorValidation = useStateSelector(
    controller.state$,
    scriptEditorValidationSelector
  );
  const isFetchingDocument = useStateSelector(controller.state$, isFetchingDocumentSelector);
  const customDocIdToLoad = useStateSelector(controller.state$, customDocIdToLoadSelector);
  const fetchDocError = useStateSelector(controller.state$, fetchDocErrorSelector);

  let isPreviewAvailable = true;

  // If no documents could be fetched from the cluster (and we are not trying to load
  // a custom doc ID) then we disable preview as the script field validation expect the result
  // of the preview to before resolving. If there are no documents we can't have a preview
  // (the _execute API expects one) and thus the validation should not expect a value.
  if (!isFetchingDocument && !customDocIdToLoad && totalDocs === 0) {
    isPreviewAvailable = false;
  }

  const { name, document, script, format, type, parentName } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const allParamsDefined = useMemo(() => {
    if (!currentDocIndex || !script?.source || !type) {
      return false;
    }
    return true;
  }, [currentDocIndex, script?.source, type]);

  const hasSomeParamsChanged = useMemo(() => {
    return (
      controller.lastExecutePainlessRequestParams.type !== type ||
      controller.lastExecutePainlessRequestParams.script !== script?.source ||
      controller.lastExecutePainlessRequestParams.documentId !== currentDocId
    );
  }, [type, script, currentDocId, controller.lastExecutePainlessRequestParams]);

  const updateSingleFieldPreview = useCallback(
    (fieldName: string, values: unknown[]) => {
      const [value] = values;
      const formattedValue = controller.valueFormatter({ value, type, format });

      controller.setPreviewResponse({
        fields: [{ key: fieldName, value, formattedValue }],
        error: null,
      });
    },
    [controller, type, format]
  );

  const updateCompositeFieldPreview = useCallback(
    (compositeValues: Record<string, unknown[]>) => {
      const updatedFieldsInScript: string[] = [];
      // if we're displaying a composite subfield, filter results
      const filterSubfield = parentName ? (field: FieldPreview) => field.key === name : () => true;

      const fields = Object.entries(compositeValues)
        .map<FieldPreview>(([key, values]) => {
          // The Painless _execute API returns the composite field values under a map.
          // Each of the key is prefixed with "composite_field." (e.g. "composite_field.field1: ['value']")
          const { 1: fieldName } = key.split('composite_field.');
          updatedFieldsInScript.push(fieldName);

          const [value] = values;
          const formattedValue = controller.valueFormatter({ value, type, format });

          return {
            key: parentName
              ? `${parentName ?? ''}.${fieldName}`
              : `${fieldName$.getValue() ?? ''}.${fieldName}`,
            value,
            formattedValue,
            type: valueTypeToSelectedType(value),
          };
        })
        .filter(filterSubfield)
        // ...and sort alphabetically
        .sort((a, b) => a.key.localeCompare(b.key));

      fieldPreview$.current.next(fields);
      controller.setPreviewResponse({
        fields,
        error: null,
      });
    },
    [parentName, name, fieldPreview$, fieldName$, controller, type, format]
  );

  const updatePreview = useCallback(async () => {
    // don't prevent rendering if we're working with a composite subfield (has parentName)
    if (!parentName && scriptEditorValidation.isValidating) {
      return;
    }

    if (
      !parentName &&
      (!allParamsDefined || !hasSomeParamsChanged || scriptEditorValidation.isValid === false)
    ) {
      controller.setIsLoadingPreview(false);
      return;
    }

    controller.lastExecutePainlessRequestParams = {
      type,
      script: script?.source,
      documentId: currentDocId,
    };

    const currentApiCall = ++controller.previewCount;

    const previewScript = (parentName && dataView.getRuntimeField(parentName)?.script) || script!;

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: document?._source!,
      context: (parentName ? 'composite_field' : `${type!}_field`) as PainlessExecuteContext,
      script: previewScript,
    });

    if (currentApiCall !== controller.previewCount) {
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
      notifications.toasts.addError(serverError, { title });

      controller.setIsLoadingPreview(false);
      return;
    }

    if (response.data) {
      const { values, error } = response.data;

      if (error) {
        controller.setPreviewResponse({
          fields: [
            {
              key: name ?? '',
              value: '',
              formattedValue: defaultValueFormatter(''),
            },
          ],
          error: { code: 'PAINLESS_SCRIPT_ERROR', error: parseEsError(error) },
        });
      } else {
        if (!Array.isArray(values)) {
          updateCompositeFieldPreview(values);
        } else {
          updateSingleFieldPreview(name!, values);
        }
      }
    }

    setInitialPreviewComplete(true);
    controller.setIsLoadingPreview(false);
  }, [
    name,
    type,
    script,
    parentName,
    dataView,
    document,
    currentDocId,
    getFieldPreview,
    notifications.toasts,
    allParamsDefined,
    scriptEditorValidation,
    hasSomeParamsChanged,
    updateSingleFieldPreview,
    updateCompositeFieldPreview,
    currentDocIndex,
    controller,
  ]);

  const ctx = useMemo<Context>(
    () => ({
      controller,
      fieldPreview$: fieldPreview$.current,
      isPreviewAvailable,
      initialPreviewComplete,
      params: {
        value: params,
        update: updateParams,
      },
      documents: {
        loadSingle: (id: string) => controller.setCustomDocIdToLoad(id),
        loadFromCluster: () => controller.fetchSampleDocuments(),
        fetchDocError,
      },
      navigation: {
        isFirstDoc: currentIdx === 0,
        isLastDoc: currentIdx >= totalDocs - 1,
      },
      panel: {
        isVisible: isPanelVisible,
        setIsVisible: setIsPanelVisible,
      },
    }),
    [
      controller,
      currentIdx,
      fieldPreview$,
      fetchDocError,
      params,
      isPreviewAvailable,
      updateParams,
      totalDocs,
      isPanelVisible,
      initialPreviewComplete,
    ]
  );

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isLoadingPreview state in this effect whenever
   * one of the _execute API param changes
   */
  useEffect(() => {
    if (allParamsDefined && hasSomeParamsChanged) {
      controller.setIsLoadingPreview(true);
    }
  }, [allParamsDefined, hasSomeParamsChanged, script?.source, type, currentDocId, controller]);

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isFetchingDocument state in this effect whenever
   * "customDocIdToLoad" changes
   */
  useEffect(() => {
    controller.setCustomId(customDocIdToLoad || undefined);
    if (customDocIdToLoad !== null && Boolean(customDocIdToLoad.trim())) {
      controller.setIsFetchingDocument(true);
    }
  }, [customDocIdToLoad, controller]);

  /**
   * Whenever we show the preview panel we will update the documents from the cluster
   */
  useEffect(() => {
    if (isPanelVisible) {
      controller.fetchSampleDocuments();
    }
  }, [isPanelVisible, controller, fieldTypeToProcess]);

  /**
   * Each time the current document changes we update the parameters
   * that will be sent in the _execute HTTP request.
   */
  useEffect(() => {
    updateParams({
      document: currentDocument,
      index: currentDocument?._index,
    });
  }, [currentDocument, updateParams]);

  /**
   * Whenever the name or the format changes we immediately update the preview
   */
  useEffect(() => {
    const { previewResponse: prev } = controller.state$.getValue();
    const { fields } = prev;

    let updatedFields: PreviewState['previewResponse']['fields'] = fields.map((field) => {
      let key = name ?? '';

      if (type === 'composite') {
        // restore initial key segement (the parent name), which was not returned
        const { 1: fieldName } = field.key.split('.');
        key = `${name ?? ''}.${fieldName}`;
      }

      return {
        ...field,
        key,
      };
    });

    // If the user has entered a name but not yet any script we will display
    // the field in the preview with just the name
    if (updatedFields.length === 0 && name !== null) {
      updatedFields = [{ key: name, value: undefined, formattedValue: undefined, type: undefined }];
    }

    controller.setPreviewResponse({
      ...prev,
      fields: updatedFields,
    });
  }, [name, type, parentName, controller]);

  /**
   * Whenever the format changes we immediately update the preview
   */
  useEffect(() => {
    const { previewResponse: prev } = controller.state$.getValue();
    const { fields } = prev;

    controller.setPreviewResponse({
      ...prev,
      fields: fields.map((field) => {
        const nextValue =
          script === null && Boolean(document)
            ? get(document?._source, name ?? '') ?? get(document?.fields, name ?? '') // When there is no script we try to read the value from _source/fields
            : field?.value;

        const formattedValue = controller.valueFormatter({ value: nextValue, type, format });

        return {
          ...field,
          value: nextValue,
          formattedValue,
        };
      }),
    });
  }, [name, script, document, controller, type, format]);

  useEffect(() => {
    if (script?.source === undefined) {
      // Whenever the source is not defined ("Set value" is toggled off or the
      // script is empty) we clear the error and update the params cache.
      controller.lastExecutePainlessRequestParams.script = undefined;
      controller.setPreviewError(null);
    }
  }, [script?.source, controller]);

  // Handle the validation state coming from the Painless DiagnosticAdapter
  // (see @kbn-monaco/src/painless/diagnostics_adapter.ts)
  useEffect(() => {
    if (scriptEditorValidation.isValidating) {
      return;
    }

    if (scriptEditorValidation.isValid === false) {
      // Make sure to remove the "Updating..." spinner
      controller.setIsLoadingPreview(false);

      // Set preview response error so it is displayed in the flyout footer
      const error =
        script?.source === undefined
          ? null
          : {
              code: 'PAINLESS_SYNTAX_ERROR' as const,
              error: {
                reason:
                  scriptEditorValidation.message ??
                  i18n.translate('indexPatternFieldEditor.fieldPreview.error.painlessSyntax', {
                    defaultMessage: 'Invalid Painless syntax',
                  }),
              },
            };
      controller.setPreviewError(error);

      // Make sure to update the lastExecutePainlessRequestParams cache so when the user updates
      // the script and fixes the syntax the "updatePreview()" will run
      controller.lastExecutePainlessRequestParams.script = script?.source;
    } else {
      // Clear possible previous syntax error
      controller.clearPreviewError('PAINLESS_SYNTAX_ERROR');
    }
  }, [scriptEditorValidation, script?.source, controller]);

  /**
   * Whenever updatePreview() changes (meaning whenever a param changes)
   * we call it to update the preview response with the field(s) value or possible error.
   */
  useDebounce(updatePreview, 500, [updatePreview]);

  /**
   * Whenever the doc ID to load changes we load the document (after a 500ms debounce)
   */
  useDebounce(
    () => {
      if (customDocIdToLoad === null) {
        return;
      }

      controller.loadDocument(customDocIdToLoad);
    },
    500,
    [customDocIdToLoad]
  );

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
