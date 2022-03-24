/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  PopoverAnchorPosition,
  EuiContextMenuItem,
  toSentenceCase,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../../../kibana_react/public';

export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
  isOnMenu?: boolean;
}

export const QueryLanguageSwitcher = React.memo(function QueryLanguageSwitcher({
  language,
  anchorPosition,
  onSelectLanguage,
  nonKqlMode = 'lucene',
  nonKqlModeHelpText,
  isOnMenu,
}: QueryLanguageSwitcherProps) {
  const kibana = useKibana();
  const kueryQuerySyntaxDocs = kibana.services.docLinks!.links.query.kueryQuerySyntax;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const luceneLabel = (
    <FormattedMessage id="data.query.queryBar.luceneLanguageName" defaultMessage="Lucene" />
  );
  const kqlLabel = (
    <FormattedMessage id="data.query.queryBar.kqlLanguageName" defaultMessage="KQL" />
  );

  const kqlFullName = (
    <FormattedMessage
      id="data.query.queryBar.kqlFullLanguageName"
      defaultMessage="Kibana Query Language"
    />
  );

  const kqlModeTitle = i18n.translate('data.query.queryBar.languageSwitcher.toText', {
    defaultMessage: 'Switch to Kibana Query Language for search',
  });

  const button = (
    <EuiButtonEmpty
      size="xs"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="euiFormControlLayout__append kqlQueryBar__languageSwitcherButton"
      data-test-subj={'switchQueryLanguageButton'}
    >
      {language === 'kuery' ? (
        kqlLabel
      ) : nonKqlMode === 'lucene' ? (
        luceneLabel
      ) : (
        <EuiIcon type={'boxesVertical'} title={kqlModeTitle} aria-label={kqlModeTitle} />
      )}
    </EuiButtonEmpty>
  );

  const languageMenuItem = (
    <div>
      <EuiContextMenuItem
        key="KQL"
        icon={language === 'kuery' ? 'check' : 'empty'}
        data-test-subj="kqlLanguageMenuItem"
        onClick={() => {
          onSelectLanguage('kuery');
        }}
      >
        KQL
      </EuiContextMenuItem>
      <EuiContextMenuItem
        key={nonKqlMode}
        icon={language === 'kuery' ? 'empty' : 'check'}
        data-test-subj="luceneLanguageMenuItem"
        onClick={() => {
          onSelectLanguage(nonKqlMode);
        }}
      >
        {toSentenceCase(nonKqlMode)}
      </EuiContextMenuItem>
      <EuiHorizontalRule margin="none" />
      <EuiContextMenuItem
        key={'documentation'}
        icon={'documentation'}
        href={kueryQuerySyntaxDocs}
        target="_blank"
      >
        Documentation
      </EuiContextMenuItem>
    </div>
  );

  const languageQueryStringComponent = (
    <EuiPopover
      id="queryLanguageSwitcherPopover"
      anchorClassName="euiFormControlLayout__append"
      anchorPosition={anchorPosition || 'downRight'}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      repositionOnScroll
      ownFocus={true}
      initialFocus={'[role="switch"]'}
    >
      <EuiPopoverTitle>
        <FormattedMessage
          id="data.query.queryBar.syntaxOptionsTitle"
          defaultMessage="Syntax options"
        />
      </EuiPopoverTitle>
      <div style={{ width: '350px' }}>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="data.query.queryBar.syntaxOptionsDescription"
              defaultMessage="The {docsLink} (KQL) offers a simplified query
              syntax and support for scripted fields. KQL also provides autocomplete.
              If you turn off KQL, {nonKqlModeHelpText}"
              values={{
                docsLink: (
                  <EuiLink href={kueryQuerySyntaxDocs} target="_blank">
                    {kqlFullName}
                  </EuiLink>
                ),
                nonKqlModeHelpText:
                  nonKqlModeHelpText ||
                  i18n.translate(
                    'data.query.queryBar.syntaxOptionsDescription.nonKqlModeHelpText',
                    {
                      defaultMessage: 'Kibana uses Lucene.',
                    }
                  ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiForm>
          <EuiFormRow label={kqlFullName}>
            <EuiSwitch
              id="queryEnhancementOptIn"
              name="popswitch"
              label={
                language === 'kuery' ? (
                  <FormattedMessage id="data.query.queryBar.kqlOnLabel" defaultMessage="On" />
                ) : (
                  <FormattedMessage id="data.query.queryBar.kqlOffLabel" defaultMessage="Off" />
                )
              }
              checked={language === 'kuery'}
              onChange={() => {
                const newLanguage = language === 'kuery' ? nonKqlMode : 'kuery';
                onSelectLanguage(newLanguage);
              }}
              data-test-subj="languageToggle"
            />
          </EuiFormRow>
        </EuiForm>
      </div>
    </EuiPopover>
  );
  return isOnMenu ? languageMenuItem : languageQueryStringComponent;
});
