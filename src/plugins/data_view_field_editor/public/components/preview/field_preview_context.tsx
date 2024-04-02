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
import { renderToString } from '@kbn/react-to-string';
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
  };
};

export const FieldPreviewProvider: FunctionComponent<{ controller: PreviewController }> = ({
  controller,
  children,
}) => {
  const {
    dataView,
    services: {
      notifications,
      api: { getFieldPreview },
    },
    fieldName$,
  } = useFieldEditorContext();

  const fieldPreview$ = useRef(new BehaviorSubject<FieldPreview[] | undefined>(undefined));

  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);

  const [scriptEditorValidation, setScriptEditorValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    message: string | null;
  }>({ isValidating: false, isValid: true, message: null });

  const { currentDocument, currentDocIndex, currentDocId } = useStateSelector(
    controller.state$,
    documentsSelector
  );

  const { name, document, script, format, type, parentName } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const updatePreview = useCallback(async () => {
    // don't prevent rendering if we're working with a composite subfield (has parentName)
    if (!parentName && scriptEditorValidation.isValidating) {
      return;
    }

    if (
      !parentName &&
      (!controller.allParamsDefined(type, script?.source, currentDocIndex) ||
        !controller.hasSomeParamsChanged(type, script?.source, currentDocId) ||
        scriptEditorValidation.isValid === false)
    ) {
      controller.setIsLoadingPreview(false);
      return;
    }

    // Not sure why this is getting called without currentDocIndex
    // would be much better to prevent this function from being called at all
    if (!currentDocIndex) {
      controller.setIsLoadingPreview(false);
      return;
    }

    controller.setLastExecutePainlessRequestParams({
      type,
      script: script?.source,
      documentId: currentDocId,
    });

    const currentApiCall = controller.incrementPreviewCount(); // ++previewCount.current;

    const previewScript = (parentName && dataView.getRuntimeField(parentName)?.script) || script!;

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: document?._source!,
      context: (parentName ? 'composite_field' : `${type!}_field`) as PainlessExecuteContext,
      script: previewScript,
    });

    if (currentApiCall !== controller.getPreviewCount()) {
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
          controller.updateCompositeFieldPreview(
            values,
            parentName,
            name!,
            fieldName$.getValue(),
            type,
            format,
            (value: FieldPreview[] | undefined) => fieldPreview$.current.next(value)
          );
        } else {
          controller.updateSingleFieldPreview(name!, values, type, format);
        }
      }
    }

    controller.setInitialPreviewComplete(true);
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
    scriptEditorValidation,
    currentDocIndex,
    controller,
    format,
    fieldName$,
  ]);

  const ctx = useMemo<Context>(
    () => ({
      controller,
      fieldPreview$: fieldPreview$.current,
      params: {
        value: params,
        update: updateParams,
      },
      validation: {
        // todo do this next
        setScriptEditorValidation,
      },
    }),
    [controller, fieldPreview$, params, updateParams]
  );

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isFetchingDocument state in this effect whenever
   * "customDocIdToLoad" changes
   */

  /**
   * Each time the current document changes we update the parameters
   * that will be sent in the _execute HTTP request.
   */
  // This game me problems
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
      controller.setLastExecutePainlessRequestParams({ script: undefined });
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
      // lastExecutePainlessRequestParams.current.script = script?.source;
      controller.setLastExecutePainlessRequestParams({ script: script?.source });
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

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
