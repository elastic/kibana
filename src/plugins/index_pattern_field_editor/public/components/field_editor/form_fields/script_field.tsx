/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

export const ScriptField = React.memo(({ existingConcreteFields = [], links }: Props) => {
  const editorValidationTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [painlessContext, setPainlessContext] = useState<PainlessContext>(
    mapReturnTypeToPainlessContext(schema.type.defaultValue[0].value!)
  );

  const [editorId, setEditorId] = useState<string | undefined>();

  const suggestionProvider = PainlessLang.getSuggestionProvider(
    painlessContext,
    existingConcreteFields
  );

  const [{ type }] = useFormData<FieldFormInternal>({ watch: 'type' });

  const sourceFieldConfig: FieldConfig<string> = useMemo(() => {
    return {
      ...schema.script.source,
      validations: [
        ...schema.script.source.validations,
        {
          validator: () => {
            if (editorValidationTimeout.current) {
              clearTimeout(editorValidationTimeout.current);
            }

            return new Promise((resolve) => {
              // monaco waits 500ms before validating, so we also add a delay
              // before checking if there are any syntax errors
              editorValidationTimeout.current = setTimeout(() => {
                const painlessSyntaxErrors = PainlessLang.getSyntaxErrors();
                // It is possible for there to be more than one editor in a view,
                // so we need to get the syntax errors based on the editor (aka model) ID
                const editorHasSyntaxErrors = editorId && painlessSyntaxErrors[editorId].length > 0;

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
              }, 600);
            });
          },
        },
      ],
    };
  }, [editorId]);

  useEffect(() => {
    setPainlessContext(mapReturnTypeToPainlessContext(type[0]!.value!));
  }, [type]);

  return (
    <UseField<string> path="script.source" config={sourceFieldConfig}>
      {({ value, setValue, label, isValid, getErrorsMessages }) => {
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
              onChange={setValue}
              editorDidMount={(editor) => setEditorId(editor.getModel()?.id)}
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
});
