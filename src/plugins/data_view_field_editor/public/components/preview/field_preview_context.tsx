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
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { BehaviorSubject } from 'rxjs';
import { RuntimePrimitiveTypes } from '../../shared_imports';
import { useStateSelector } from '../../state_utils';

import { parseEsError } from '../../lib/runtime_field_validation';
import { useFieldEditorContext } from '../field_editor_context';
import type {
  PainlessExecuteContext,
  Context,
  Params,
  EsDocument,
  ScriptErrorCodes,
  FetchDocError,
  FieldPreview,
  PreviewState,
} from './types';
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

// todo might break down
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

export const FieldPreviewProvider: FunctionComponent<{ controller: PreviewController }> = ({
  controller,
  children,
}) => {
  const previewCount = useRef(0);

  // We keep in cache the latest params sent to the _execute API so we don't make unecessary requests
  // when changing parameters that don't affect the preview result (e.g. changing the "name" field).
  const lastExecutePainlessRequestParams = useRef<{
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  }>({
    type: null,
    script: undefined,
    documentId: undefined,
  });

  const {
    dataView,
    fieldTypeToProcess,
    services: {
      search,
      notifications,
      api: { getFieldPreview },
    },
    fieldFormats,
    fieldName$,
  } = useFieldEditorContext();

  const fieldPreview$ = useRef(new BehaviorSubject<FieldPreview[] | undefined>(undefined));

  /** Response from the Painless _execute API */
  const [previewResponse, setPreviewResponse] = useState<{
    fields: Context['fields'];
    error: Context['error'];
  }>({ fields: [], error: null });
  const [initialPreviewComplete, setInitialPreviewComplete] = useState(false);

  /** Possible error while fetching sample documents */
  const [fetchDocError, setFetchDocError] = useState<FetchDocError | null>(null);
  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);

  /** Flag to show/hide the preview panel */
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  /** Flag to indicate if we are loading document from cluster */
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);
  /** Flag to indicate if we are calling the _execute API */
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  /** Flag to indicate if we are loading a single document by providing its ID */
  const [customDocIdToLoad, setCustomDocIdToLoad] = useState<string | null>(null);

  const { currentDocument, currentDocIndex, currentDocId, totalDocs, currentIdx } =
    useStateSelector(controller.state$, documentsSelector);
  const scriptEditorValidation = useStateSelector(
    controller.state$,
    scriptEditorValidationSelector
  );
  const isCustomDocId = customDocIdToLoad !== null;
  let isPreviewAvailable = true;

  // If no documents could be fetched from the cluster (and we are not trying to load
  // a custom doc ID) then we disable preview as the script field validation expect the result
  // of the preview to before resolving. If there are no documents we can't have a preview
  // (the _execute API expects one) and thus the validation should not expect a value.
  if (!isFetchingDocument && !isCustomDocId && totalDocs === 0) {
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
      lastExecutePainlessRequestParams.current.type !== type ||
      lastExecutePainlessRequestParams.current.script !== script?.source ||
      lastExecutePainlessRequestParams.current.documentId !== currentDocId
    );
  }, [type, script, currentDocId]);

  const setPreviewError = useCallback((error: Context['error']) => {
    setPreviewResponse((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const clearPreviewError = useCallback((errorCode: ScriptErrorCodes) => {
    setPreviewResponse((prev) => {
      const error = prev.error === null || prev.error?.code === errorCode ? null : prev.error;
      return {
        ...prev,
        error,
      };
    });
  }, []);

  const valueFormatter = useCallback(
    (value: unknown) => {
      if (format?.id) {
        const formatter = fieldFormats.getInstance(format.id, format.params);
        if (formatter) {
          return formatter.getConverterFor('html')(value) ?? JSON.stringify(value);
        }
      }

      if (type) {
        const fieldType = castEsToKbnFieldTypeName(type);
        const defaultFormatterForType = fieldFormats.getDefaultInstance(fieldType);
        if (defaultFormatterForType) {
          return defaultFormatterForType.getConverterFor('html')(value) ?? JSON.stringify(value);
        }
      }

      return defaultValueFormatter(value);
    },
    [format, type, fieldFormats]
  );

  const fetchSampleDocuments = useCallback(
    async (limit: number = 50) => {
      if (typeof limit !== 'number') {
        // We guard ourself from passing an <input /> event accidentally
        throw new Error('The "limit" option must be a number');
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      setIsFetchingDocument(true);
      setPreviewResponse({ fields: [], error: null });

      const [response, searchError] = await search
        .search({
          params: {
            index: dataView.getIndexPattern(),
            body: {
              fields: ['*'],
              size: limit,
            },
          },
        })
        .toPromise()
        .then((res) => [res, null])
        .catch((err) => [null, err]);

      setIsFetchingDocument(false);
      setCustomDocIdToLoad(null);

      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: searchError.toString(),
              reason: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.errorLoadingSampleDocumentsDescription',
                {
                  defaultMessage: 'Error loading sample documents.',
                }
              ),
            },
          }
        : null;

      setFetchDocError(error);

      if (error === null) {
        controller.setDocuments(response ? response.rawResponse.hits.hits : []);
      }
    },
    [dataView, search, controller]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      if (!Boolean(id.trim())) {
        return;
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      setIsFetchingDocument(true);

      const [response, searchError] = await search
        .search({
          params: {
            index: dataView.getIndexPattern(),
            body: {
              size: 1,
              fields: ['*'],
              query: {
                ids: {
                  values: [id],
                },
              },
            },
          },
        })
        .toPromise()
        .then((res) => [res, null])
        .catch((err) => [null, err]);

      setIsFetchingDocument(false);

      const isDocumentFound = response?.rawResponse.hits.total > 0;
      const loadedDocuments: EsDocument[] = isDocumentFound ? response.rawResponse.hits.hits : [];
      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: searchError.toString(),
              reason: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.errorLoadingDocumentDescription',
                {
                  defaultMessage: 'Error loading document.',
                }
              ),
            },
          }
        : isDocumentFound === false
        ? {
            code: 'DOC_NOT_FOUND',
            error: {
              message: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.documentNotFoundDescription',
                {
                  defaultMessage: 'Document ID not found',
                }
              ),
            },
          }
        : null;

      setFetchDocError(error);

      if (error === null) {
        controller.setDocuments(loadedDocuments);
      } else {
        // Make sure we disable the "Updating..." indicator as we have an error
        // and we won't fetch the preview
        setIsLoadingPreview(false);
      }
    },
    [dataView, search, controller]
  );

  const updateSingleFieldPreview = useCallback(
    (fieldName: string, values: unknown[]) => {
      const [value] = values;
      const formattedValue = valueFormatter(value);

      setPreviewResponse({
        fields: [{ key: fieldName, value, formattedValue }],
        error: null,
      });
    },
    [valueFormatter]
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
          const formattedValue = valueFormatter(value);

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
      setPreviewResponse({
        fields,
        error: null,
      });
    },
    [valueFormatter, parentName, name, fieldPreview$, fieldName$]
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
      setIsLoadingPreview(false);
      return;
    }

    lastExecutePainlessRequestParams.current = {
      type,
      script: script?.source,
      documentId: currentDocId,
    };

    const currentApiCall = ++previewCount.current;

    const previewScript = (parentName && dataView.getRuntimeField(parentName)?.script) || script!;

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: document?._source!,
      context: (parentName ? 'composite_field' : `${type!}_field`) as PainlessExecuteContext,
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
      notifications.toasts.addError(serverError, { title });

      setIsLoadingPreview(false);
      return;
    }

    if (response.data) {
      const { values, error } = response.data;

      if (error) {
        setPreviewResponse({
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
    setIsLoadingPreview(false);
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
  ]);

  const reset = useCallback(() => {
    // By resetting the previewCount we will discard previous inflight
    // API call response coming in after calling reset() was called
    previewCount.current = 0;

    controller.setDocuments([]);
    setPreviewResponse({ fields: [], error: null });
    setIsLoadingPreview(false);
    setIsFetchingDocument(false);
  }, [controller]);

  const ctx = useMemo<Context>(
    () => ({
      controller,
      fields: previewResponse.fields,
      error: previewResponse.error,
      fieldPreview$: fieldPreview$.current,
      isPreviewAvailable,
      isLoadingPreview,
      initialPreviewComplete,
      params: {
        value: params,
        update: updateParams,
      },
      documents: {
        loadSingle: setCustomDocIdToLoad,
        loadFromCluster: fetchSampleDocuments,
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
      reset,
    }),
    [
      controller,
      currentIdx,
      previewResponse,
      fieldPreview$,
      fetchDocError,
      params,
      isPreviewAvailable,
      isLoadingPreview,
      updateParams,
      fetchSampleDocuments,
      totalDocs,
      isPanelVisible,
      reset,
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
      setIsLoadingPreview(true);
    }
  }, [allParamsDefined, hasSomeParamsChanged, script?.source, type, currentDocId]);

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isFetchingDocument state in this effect whenever
   * "customDocIdToLoad" changes
   */
  useEffect(() => {
    if (customDocIdToLoad !== null && Boolean(customDocIdToLoad.trim())) {
      setIsFetchingDocument(true);
    }
  }, [customDocIdToLoad]);

  /**
   * Whenever we show the preview panel we will update the documents from the cluster
   */
  useEffect(() => {
    if (isPanelVisible) {
      fetchSampleDocuments();
    }
  }, [isPanelVisible, fetchSampleDocuments, fieldTypeToProcess]);

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
    setPreviewResponse((prev) => {
      const { fields } = prev;

      let updatedFields: Context['fields'] = fields.map((field) => {
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
        updatedFields = [
          { key: name, value: undefined, formattedValue: undefined, type: undefined },
        ];
      }

      return {
        ...prev,
        fields: updatedFields,
      };
    });
  }, [name, type, parentName]);

  /**
   * Whenever the format changes we immediately update the preview
   */
  useEffect(() => {
    setPreviewResponse((prev) => {
      const { fields } = prev;

      return {
        ...prev,
        fields: fields.map((field) => {
          const nextValue =
            script === null && Boolean(document)
              ? get(document?._source, name ?? '') ?? get(document?.fields, name ?? '') // When there is no script we try to read the value from _source/fields
              : field?.value;

          const formattedValue = valueFormatter(nextValue);

          return {
            ...field,
            value: nextValue,
            formattedValue,
          };
        }),
      };
    });
  }, [name, script, document, valueFormatter]);

  useEffect(() => {
    if (script?.source === undefined) {
      // Whenever the source is not defined ("Set value" is toggled off or the
      // script is empty) we clear the error and update the params cache.
      lastExecutePainlessRequestParams.current.script = undefined;
      setPreviewError(null);
    }
  }, [script?.source, setPreviewError]);

  // Handle the validation state coming from the Painless DiagnosticAdapter
  // (see @kbn-monaco/src/painless/diagnostics_adapter.ts)
  useEffect(() => {
    if (scriptEditorValidation.isValidating) {
      return;
    }

    if (scriptEditorValidation.isValid === false) {
      // Make sure to remove the "Updating..." spinner
      setIsLoadingPreview(false);

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
      setPreviewError(error);

      // Make sure to update the lastExecutePainlessRequestParams cache so when the user updates
      // the script and fixes the syntax the "updatePreview()" will run
      lastExecutePainlessRequestParams.current.script = script?.source;
    } else {
      // Clear possible previous syntax error
      clearPreviewError('PAINLESS_SYNTAX_ERROR');
    }
  }, [scriptEditorValidation, script?.source, setPreviewError, clearPreviewError]);

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

      loadDocument(customDocIdToLoad);
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
