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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
}

export const QueryLanguageSwitcher = React.memo(function QueryLanguageSwitcher({
  language,
  anchorPosition,
  onSelectLanguage,
  nonKqlMode = 'lucene',
  nonKqlModeHelpText,
}: QueryLanguageSwitcherProps) {
  const kibana = useKibana();
  const kueryQuerySyntaxDocs = kibana.services.docLinks!.links.query.kueryQuerySyntax;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const luceneLabel = (
    <FormattedMessage
      id="unifiedSearch.query.queryBar.luceneLanguageName"
      defaultMessage="Lucene"
    />
  );
  const kqlLabel = (
    <FormattedMessage id="unifiedSearch.query.queryBar.kqlLanguageName" defaultMessage="KQL" />
  );

  const kqlFullName = (
    <FormattedMessage
      id="unifiedSearch.query.queryBar.kqlFullLanguageName"
      defaultMessage="Kibana Query Language"
    />
  );

  const kqlModeTitle = i18n.translate('unifiedSearch.query.queryBar.languageSwitcher.toText', {
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

  return (
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
          id="unifiedSearch.query.queryBar.syntaxOptionsTitle"
          defaultMessage="Syntax options"
        />
      </EuiPopoverTitle>
      <div style={{ width: '350px' }}>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="unifiedSearch.query.queryBar.syntaxOptionsDescription"
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
                    'unifiedSearch.query.queryBar.syntaxOptionsDescription.nonKqlModeHelpText',
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
                  <FormattedMessage
                    id="unifiedSearch.query.queryBar.kqlOnLabel"
                    defaultMessage="On"
                  />
                ) : (
                  <FormattedMessage
                    id="unifiedSearch.query.queryBar.kqlOffLabel"
                    defaultMessage="Off"
                  />
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
});
