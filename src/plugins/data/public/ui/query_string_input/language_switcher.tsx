/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  PopoverAnchorPosition,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { useKibana } from '../../../../kibana_react/public';

interface Props {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
}

export function QueryLanguageSwitcher(props: Props) {
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

  const button = (
    <EuiButtonEmpty
      size="xs"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="euiFormControlLayout__append kqlQueryBar__languageSwitcherButton"
      data-test-subj={'switchQueryLanguageButton'}
    >
      {props.language === 'lucene' ? luceneLabel : kqlLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="queryLanguageSwitcherPopover"
      anchorClassName="euiFormControlLayout__append"
      anchorPosition={props.anchorPosition || 'downRight'}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      repositionOnScroll
    >
      <EuiPopoverTitle>
        <FormattedMessage
          id="data.query.queryBar.syntaxOptionsTitle"
          defaultMessage="Syntax options"
        />
      </EuiPopoverTitle>
      <div style={{ width: '350px' }}>
        <EuiText>
          <p>
            <FormattedMessage
              id="data.query.queryBar.syntaxOptionsDescription"
              defaultMessage="The {docsLink} (KQL) offers a simplified query
              syntax and support for scripted fields. KQL also provides autocomplete if you have
              a Basic license or above. If you turn off KQL, Kibana uses Lucene."
              values={{
                docsLink: (
                  <EuiLink href={kueryQuerySyntaxDocs} target="_blank">
                    {kqlFullName}
                  </EuiLink>
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
                props.language === 'kuery' ? (
                  <FormattedMessage id="data.query.queryBar.kqlOnLabel" defaultMessage="On" />
                ) : (
                  <FormattedMessage id="data.query.queryBar.kqlOffLabel" defaultMessage="Off" />
                )
              }
              checked={props.language === 'kuery'}
              onChange={() => {
                const newLanguage = props.language === 'lucene' ? 'kuery' : 'lucene';
                props.onSelectLanguage(newLanguage);
              }}
              data-test-subj="languageToggle"
            />
          </EuiFormRow>
        </EuiForm>
      </div>
    </EuiPopover>
  );
}
