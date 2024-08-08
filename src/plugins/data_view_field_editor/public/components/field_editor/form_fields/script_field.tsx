/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { first, firstValueFrom } from 'rxjs';
import type { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiLink, EuiCode } from '@elastic/eui';
import { PainlessLang, PainlessContext, monaco } from '@kbn/monaco';

import {
  UseField,
  useFormData,
  useBehaviorSubject,
  RuntimeType,
  CodeEditor,
  useFormContext,
} from '../../../shared_imports';
import type { RuntimeFieldPainlessError } from '../../../types';
import { painlessErrorToMonacoMarker } from '../../../lib';
import { useFieldPreviewContext } from '../../preview';
import { schema } from '../form_schema';
import type { FieldFormInternal } from '../field_editor';
import { useStateSelector } from '../../../state_utils';
import { PreviewState } from '../../preview/types';

interface Props {
  links: { runtimePainless: string };
  placeholder?: string;
}

const mapReturnTypeToPainlessContext = (runtimeType: RuntimeType): PainlessContext => {
  switch (runtimeType) {
    case 'keyword':
      return 'string_script_field_script_field';
    case 'long':
      return 'long_script_field_script_field';
    case 'double':
      return 'double_script_field_script_field';
    case 'date':
      return 'date_script_field';
    case 'ip':
      return 'ip_script_field_script_field';
    case 'boolean':
      return 'boolean_script_field_script_field';
    default:
      return 'string_script_field_script_field';
  }
};

const currentDocumentSelector = (state: PreviewState) => state.documents[state.currentIdx];
const currentDocumentIsLoadingSelector = (state: PreviewState) => state.isLoadingDocuments;
const currentErrorSelector = (state: PreviewState) => state.previewResponse?.error;
const isLoadingPreviewSelector = (state: PreviewState) => state.isLoadingPreview;
const isPreviewAvailableSelector = (state: PreviewState) => state.isPreviewAvailable;
const concreteFieldsSelector = (state: PreviewState) => state.concreteFields;

const ScriptFieldComponent = ({ links, placeholder }: Props) => {
  const {
    validation: { setScriptEditorValidation },
  } = useFieldPreviewContext();
  const monacoEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorValidationSubscription = useRef<Subscription>();
  const fieldCurrentValue = useRef<string>('');

  const { controller } = useFieldPreviewContext();
  const error = useStateSelector(controller.state$, currentErrorSelector);
  const currentDocument = useStateSelector(controller.state$, currentDocumentSelector);
  const isFetchingDoc = useStateSelector(controller.state$, currentDocumentIsLoadingSelector);
  const isLoadingPreview = useStateSelector(controller.state$, isLoadingPreviewSelector);
  const isPreviewAvailable = useStateSelector(controller.state$, isPreviewAvailableSelector);
  /**
   * An array of existing concrete fields. If the user gives a name to the runtime
   * field that matches one of the concrete fields, a callout will be displayed
   * to indicate that this runtime field will shadow the concrete field.
   * It is also used to provide the list of field autocomplete suggestions to the code editor.
   */
  const concreteFields = useStateSelector(controller.state$, concreteFieldsSelector);
  const [validationData$, nextValidationData$] = useBehaviorSubject<
    | {
        isFetchingDoc: boolean;
        isLoadingPreview: boolean;
        error: PreviewState['previewResponse']['error'];
      }
    | undefined
  >(undefined);

  const [painlessContext, setPainlessContext] = useState<PainlessContext>(
    mapReturnTypeToPainlessContext(schema.type.defaultValue![0].value!)
  );

  const currentDocId = currentDocument?._id;

  const suggestionProvider = useMemo(
    () => PainlessLang.getSuggestionProvider(painlessContext, concreteFields),
    [painlessContext, concreteFields]
  );

  const { validateFields } = useFormContext();

  // Listen to formData changes **before** validations are executed
  const onFormDataChange = useCallback(
    ({ type }: FieldFormInternal) => {
      if (type !== undefined) {
        setPainlessContext(mapReturnTypeToPainlessContext(type[0]!.value!));
      }

      if (isPreviewAvailable) {
        // To avoid a race condition where the validation would run before
        // the context state are updated, we clear the old value of the observable.
        // This way the validationDataProvider() will await until new values come in before resolving
        nextValidationData$(undefined);
      }
    },
    [nextValidationData$, isPreviewAvailable]
  );

  useFormData<FieldFormInternal>({
    watch: ['type', 'script.source'],
    onChange: onFormDataChange,
  });

  const validationDataProvider = useCallback(async () => {
    const validationData = await firstValueFrom(
      validationData$.pipe(
        first((data) => {
          // We first wait to get field preview data
          if (data === undefined) {
            return false;
          }

          // We are not interested in preview data meanwhile it
          // is still making HTTP request
          if (data.isFetchingDoc || data.isLoadingPreview) {
            return false;
          }

          return true;
        })
      )
    );

    return validationData!.error;
  }, [validationData$]);

  const onEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      monacoEditor.current = editor;

      if (editorValidationSubscription.current) {
        editorValidationSubscription.current.unsubscribe();
      }

      editorValidationSubscription.current = PainlessLang.validation$().subscribe(
        ({ isValid, isValidating, errors }) => {
          setScriptEditorValidation({
            isValid,
            isValidating,
            message: errors[0]?.message ?? null,
          });
        }
      );
    },
    [setScriptEditorValidation]
  );

  const updateMonacoMarkers = useCallback((markers: monaco.editor.IMarkerData[]) => {
    const model = monacoEditor.current?.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, PainlessLang.ID, markers);
    }
  }, []);

  const displayPainlessScriptErrorInMonaco = useCallback(
    (painlessError: RuntimeFieldPainlessError) => {
      const model = monacoEditor.current?.getModel();

      if (painlessError.position !== null && Boolean(model)) {
        const { offset } = painlessError.position;
        // Get the monaco Position (lineNumber and colNumber) from the ES Painless error position
        const errorStartPosition = model!.getPositionAt(offset);
        const markerData = painlessErrorToMonacoMarker(painlessError, errorStartPosition);
        const errorMarkers = markerData ? [markerData] : [];
        updateMonacoMarkers(errorMarkers);
      }
    },
    [updateMonacoMarkers]
  );

  // Whenever we navigate to a different doc we validate the script
  // field as it could be invalid against the new document.
  useEffect(() => {
    if (fieldCurrentValue.current.trim() !== '' && currentDocId !== undefined) {
      validateFields(['script.source']);
    }
  }, [currentDocId, validateFields]);

  useEffect(() => {
    nextValidationData$({ isFetchingDoc, isLoadingPreview, error });
  }, [nextValidationData$, isFetchingDoc, isLoadingPreview, error]);

  useEffect(() => {
    if (error?.code === 'PAINLESS_SCRIPT_ERROR') {
      displayPainlessScriptErrorInMonaco(error!.error as RuntimeFieldPainlessError);
    } else if (error === null) {
      updateMonacoMarkers([]);
    }
  }, [error, displayPainlessScriptErrorInMonaco, updateMonacoMarkers]);

  useEffect(() => {
    return () => {
      if (editorValidationSubscription.current) {
        editorValidationSubscription.current.unsubscribe();
      }
    };
  }, []);

  return (
    <UseField<string> path="script.source" validationDataProvider={validationDataProvider}>
      {({ value, setValue, label, isValid, getErrorsMessages }) => {
        let errorMessage = getErrorsMessages();

        if (error) {
          errorMessage = error.error.reason!;
        }
        fieldCurrentValue.current = value;

        return (
          <>
            <EuiFormRow
              label={label}
              hasChildLabel={false}
              id="runtimeFieldScript"
              error={errorMessage}
              isInvalid={!isValid}
              data-test-subj="scriptFieldRow"
              helpText={
                <FormattedMessage
                  id="indexPatternFieldEditor.editor.form.source.scriptFieldHelpText"
                  defaultMessage="Runtime fields without a script retrieve values from {source}. If the field doesn't exist in _source, a search request returns no value. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        href={links.runtimePainless}
                        target="_blank"
                        external
                        data-test-subj="painlessSyntaxLearnMoreLink"
                      >
                        {i18n.translate(
                          'indexPatternFieldEditor.editor.form.script.learnMoreLinkText',
                          {
                            defaultMessage: 'Learn about script syntax.',
                          }
                        )}
                      </EuiLink>
                    ),
                    source: <EuiCode>{'_source'}</EuiCode>,
                  }}
                />
              }
              fullWidth
            >
              <CodeEditor
                languageId={PainlessLang.ID}
                suggestionProvider={suggestionProvider}
                // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
                width="99%"
                height="210px"
                value={value}
                onChange={setValue}
                editorDidMount={onEditorDidMount}
                options={{
                  fontSize: 12,
                  minimap: {
                    enabled: false,
                  },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  automaticLayout: true,
                  suggest: {
                    snippetsPreventQuickSuggestions: false,
                  },
                }}
                data-test-subj="scriptField"
                aria-label={i18n.translate(
                  'indexPatternFieldEditor.editor.form.scriptEditorAriaLabel',
                  {
                    defaultMessage: 'Script editor',
                  }
                )}
                placeholder={placeholder}
              />
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};

export const ScriptField = React.memo(ScriptFieldComponent);
