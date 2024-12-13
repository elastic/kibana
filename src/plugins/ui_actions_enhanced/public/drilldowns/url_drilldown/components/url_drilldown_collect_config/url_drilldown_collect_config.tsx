/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { EuiFormRow, EuiLink, EuiAccordion, EuiSpacer, EuiPanel } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { UrlTemplateEditor, UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { UrlDrilldownConfig } from '../../types';
import './index.scss';
import {
  txtUrlTemplateSyntaxHelpLinkText,
  txtUrlTemplateLabel,
  txtUrlTemplateAdditionalOptions,
  txtEmptyErrorMessage,
  txtInvalidFormatErrorMessage,
  txtUrlTemplateSyntaxTestingHelpText,
} from './i18n';
import { VariablePopover } from '../variable_popover';
import { UrlDrilldownOptionsComponent } from './lazy';
import { DEFAULT_URL_DRILLDOWN_OPTIONS } from '../../constants';
import { validateUrl } from '../../url_validation';

export interface UrlDrilldownCollectConfigProps {
  config: UrlDrilldownConfig;
  variables: UrlTemplateEditorVariable[];
  exampleUrl: string;
  onConfig: (newConfig: UrlDrilldownConfig) => void;
  syntaxHelpDocsLink?: string;
  variablesHelpDocsLink?: string;
}

const isCursorBetweenDoubleCurlyBrackets = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return false;

  const offset = model.getOffsetAt(position);
  const text = model.getValue();
  const twoCharactersBeforeOffset = text.slice(offset - 2, offset);
  const twoCharactersAfterOffset = text.slice(offset, offset + 2);

  return twoCharactersBeforeOffset === '{{' && twoCharactersAfterOffset === '}}';
};

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfigProps> = ({
  config,
  variables,
  exampleUrl,
  onConfig,
  syntaxHelpDocsLink,
  variablesHelpDocsLink,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isPristine, setIsPristine] = React.useState(true);
  const urlTemplate = config.url.template ?? '';

  function updateUrlTemplate(newUrlTemplate: string) {
    if (config.url.template !== newUrlTemplate) {
      setIsPristine(false);
      onConfig({
        ...config,
        url: {
          ...config.url,
          template: newUrlTemplate,
        },
      });
    }
  }
  const isEmpty = !urlTemplate;

  const isValidUrlFormat = validateUrl(urlTemplate);
  const isInvalid = !isPristine && (isEmpty || !isValidUrlFormat.isValid);

  const invalidErrorMessage = isInvalid
    ? isEmpty
      ? txtEmptyErrorMessage
      : txtInvalidFormatErrorMessage({ error: isValidUrlFormat.error!, example: exampleUrl })
    : undefined;

  const variablesDropdown = (
    <VariablePopover
      variables={variables}
      variablesHelpLink={variablesHelpDocsLink}
      onSelect={(variable: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const text = isCursorBetweenDoubleCurlyBrackets(editor) ? variable : `{{${variable}}}`;

        editor.trigger('keyboard', 'type', {
          text,
        });
      }}
    />
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        isInvalid={isInvalid}
        error={invalidErrorMessage}
        className={'uaeUrlDrilldownCollectConfig__urlTemplateFormRow'}
        label={txtUrlTemplateLabel}
        helpText={
          <>
            {txtUrlTemplateSyntaxTestingHelpText}{' '}
            {syntaxHelpDocsLink ? (
              <EuiLink external target={'_blank'} href={syntaxHelpDocsLink}>
                {txtUrlTemplateSyntaxHelpLinkText}
              </EuiLink>
            ) : null}
          </>
        }
        labelAppend={variablesDropdown}
      >
        <UrlTemplateEditor
          fitToContent={{ minLines: 5, maxLines: 15 }}
          variables={variables}
          value={urlTemplate}
          placeholder={exampleUrl}
          onChange={(newUrlTemplate) => updateUrlTemplate(newUrlTemplate)}
          onEditor={(editor) => {
            editorRef.current = editor;
          }}
        />
      </EuiFormRow>
      <EuiSpacer size={'l'} />
      <EuiAccordion
        id="accordion_url_drilldown_additional_options"
        buttonContent={txtUrlTemplateAdditionalOptions}
        data-test-subj="urlDrilldownAdditionalOptions"
      >
        <EuiSpacer size={'s'} />
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} css={{ border: 'none' }}>
          <UrlDrilldownOptionsComponent
            options={{ ...DEFAULT_URL_DRILLDOWN_OPTIONS, ...config }}
            onOptionChange={(change) => {
              onConfig({ ...config, ...change });
            }}
          />
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
