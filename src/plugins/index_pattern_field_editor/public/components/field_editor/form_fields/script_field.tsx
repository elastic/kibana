/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { first } from 'rxjs/operators';
import type { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiLink, EuiCode, EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';
import { PainlessLang, PainlessContext, monaco } from '@kbn/monaco';

import {
  UseField,
  useFormData,
  RuntimeType,
  FieldConfig,
  CodeEditor,
} from '../../../shared_imports';
import { RuntimeFieldPainlessError } from '../../../lib';
import { schema } from '../form_schema';
import type { FieldFormInternal } from '../field_editor';

interface Props {
  links: { runtimePainless: string };
  existingConcreteFields?: Array<{ name: string; type: string }>;
  syntaxError: ScriptSyntaxError;
}

export interface ScriptSyntaxError {
  error: RuntimeFieldPainlessError | null;
  clear: () => void;
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

type CancelablePromise = Promise<any> & { cancel?(): void };

export const ScriptField = React.memo(({ existingConcreteFields, links, syntaxError }: Props) => {
  const monacoEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const [painlessContext, setPainlessContext] = useState<PainlessContext>(
    mapReturnTypeToPainlessContext(schema.type.defaultValue[0].value!)
  );

  const [editorId, setEditorId] = useState<string | undefined>();

  const suggestionProvider = useMemo(
    () => PainlessLang.getSuggestionProvider(painlessContext, existingConcreteFields),
    [painlessContext, existingConcreteFields]
  );

  const [{ type, script: { source } = { source: '' } }] = useFormData<FieldFormInternal>({
    watch: ['type', 'script.source'],
  });

  const { clear: clearSyntaxError } = syntaxError;

  const sourceFieldConfig: FieldConfig<string> = useMemo(() => {
    return {
      ...schema.script.source,
      validations: [
        ...schema.script.source.validations,
        {
          validator: () => {
            let isValidatingSub: Subscription;

            const promise: CancelablePromise = new Promise((resolve) => {
              // Wait to finish validating
              isValidatingSub = PainlessLang.isValidating()
                .pipe(first((isValidating) => isValidating === false))
                .subscribe(() => {
                  const painlessSyntaxErrors = PainlessLang.getSyntaxErrors();
                  // It is possible for there to be more than one editor in a view,
                  // so we need to get the syntax errors based on the editor (aka model) ID
                  const editorHasSyntaxErrors =
                    editorId &&
                    painlessSyntaxErrors[editorId] &&
                    painlessSyntaxErrors[editorId].length > 0;

                  if (editorHasSyntaxErrors) {
                    return resolve({
                      message: i18n.translate(
                        'indexPatternFieldEditor.editor.form.scriptEditorValidationMessage',
                        {
                          defaultMessage: 'Invalid Painless syntax.',
                        }
                      ),
                    });
                  }

                  resolve(undefined);
                });
            });

            promise.cancel = () => {
              if (isValidatingSub) {
                isValidatingSub.unsubscribe();
              }
            };

            return promise;
          },
        },
      ],
    };
  }, [editorId]);

  const onEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    monacoEditor.current = editor;
    setEditorId(editor.getModel()?.id);
  }, []);

  useEffect(() => {
    setPainlessContext(mapReturnTypeToPainlessContext(type[0]!.value!));
  }, [type]);

  useEffect(() => {
    // Whenever the source changes we clear potential syntax errors
    clearSyntaxError();
  }, [source, clearSyntaxError]);

  return (
    <UseField<string> path="script.source" config={sourceFieldConfig}>
      {({ value, setValue, label, isValid, getErrorsMessages }) => {
        let errorMessage: string | null = '';
        if (syntaxError.error !== null) {
          errorMessage = syntaxError.error.reason ?? syntaxError.error.message;
        } else {
          errorMessage = getErrorsMessages();
        }

        return (
          <>
            <EuiFormRow
              label={label}
              error={errorMessage}
              isInvalid={syntaxError.error !== null || !isValid}
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
                height="300px"
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
              />
            </EuiFormRow>

            {/* Help the user debug the error by showing where it failed in the script */}
            {syntaxError.error !== null && (
              <>
                <EuiSpacer />
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'indexPatternFieldEditor.editor.form.scriptEditor.debugErrorMessage',
                      {
                        defaultMessage: 'Syntax error detail',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiCodeBlock
                  // @ts-ignore
                  whiteSpace="pre"
                >
                  {syntaxError.error.scriptStack.join('\n')}
                </EuiCodeBlock>
              </>
            )}
          </>
        );
      }}
    </UseField>
  );
});
