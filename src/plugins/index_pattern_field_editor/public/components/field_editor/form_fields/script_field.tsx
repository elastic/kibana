/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiLink, EuiCode } from '@elastic/eui';
import { PainlessLang, PainlessContext } from '@kbn/monaco';

import {
  UseField,
  useFormData,
  RuntimeType,
  FieldConfig,
  CodeEditor,
  ValidationError,
} from '../../../shared_imports';
import { schema } from '../form_schema';
import type { FieldFormInternal } from '../field_editor';

interface Props {
  links: { runtimePainless: string };
  existingConcreteFields?: Array<{ name: string; type: string }>;
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

const typeConfig = schema.type! as FieldConfig<RuntimeType>;
const defaultType = typeConfig.defaultValue!;

export const ScriptField = ({ existingConcreteFields = [], links }: Props) => {
  let editorValidationTimeout: ReturnType<typeof setTimeout>;

  const [painlessContext, setPainlessContext] = useState<PainlessContext>(
    mapReturnTypeToPainlessContext(defaultType)
  );

  const suggestionProvider = PainlessLang.getSuggestionProvider(
    painlessContext,
    existingConcreteFields
  );

  const [{ type }] = useFormData<FieldFormInternal>({ watch: 'type' });

  const validateScript = (setErrors: (errors: Array<ValidationError<string>>) => void) => {
    // monaco waits 500ms before validating, so we also add a delay
    // before checking if there are any syntax errors
    clearTimeout(editorValidationTimeout);
    editorValidationTimeout = setTimeout(() => {
      const hasSyntaxError = PainlessLang.hasSyntaxError();
      if (hasSyntaxError) {
        setErrors([
          {
            message: i18n.translate(
              'indexPatternFieldEditor.editor.form.scriptEditorValidationMessage',
              {
                defaultMessage: 'Invalid Painless syntax.',
              }
            ),
          },
        ]);
      }
    }, 600);
  };

  useEffect(() => {
    setPainlessContext(mapReturnTypeToPainlessContext(type[0]!.value!));
  }, [type]);

  return (
    <UseField<string> path="script.source">
      {({ value, setValue, label, isValid, getErrorsMessages, setErrors }) => {
        return (
          <EuiFormRow
            label={label}
            error={getErrorsMessages()}
            isInvalid={!isValid}
            helpText={
              <FormattedMessage
                id="indexPatternFieldEditor.editor.form.source.scriptFieldHelpText"
                defaultMessage="Runtime fields without a script retrieve values from a field with the same name in {source}. If a field with the same name doesn’t exist, no values return when a search request includes the runtime field. {learnMoreLink}"
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
              width="100%"
              height="300px"
              value={value}
              onChange={(newValue) => {
                setValue(newValue);
                validateScript(setErrors);
              }}
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
        );
      }}
    </UseField>
  );
};
