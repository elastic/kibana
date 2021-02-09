/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  PopoverAnchorPosition,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { useKibana } from '../../../../kibana_react/public';

export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  includeEqlLanguage?: boolean;
}

const QueryLanguageSwitcher = React.memo((props: QueryLanguageSwitcherProps) => {
  const kibana = useKibana();
  const kueryQuerySyntaxDocs = kibana.services.docLinks!.links.query.kueryQuerySyntax;
  const eqlQuerySyntaxDocs = kibana.services.docLinks!.links.query.eql;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const luceneLabel = (
    <FormattedMessage id="data.query.queryBar.luceneLanguageName" defaultMessage="Lucene" />
  );
  const kqlLabel = (
    <FormattedMessage id="data.query.queryBar.kqlLanguageName" defaultMessage="KQL" />
  );
  const eqlLabel = (
    <FormattedMessage id="data.query.queryBar.eqlLanguageName" defaultMessage="EQL" />
  );
  const kqlFullName = (
    <FormattedMessage
      id="data.query.queryBar.kqlFullLanguageName"
      defaultMessage="Kibana Query Language"
    />
  );
  const eqlFullName = (
    <FormattedMessage
      id="data.query.queryBar.eqlFullLanguageName"
      defaultMessage="Event Query Language"
    />
  );

  const kqlDescription = (
    <FormattedMessage
      id="data.query.queryBar.syntaxKqlOptionsDescription"
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
  );

  const eqlDescription = (
    <FormattedMessage
      id="data.query.queryBar.syntaxEqlOptionsDescription"
      defaultMessage="The {docsLink} (EQL) is a query language for event-based time series data, such as logs, metrics, and traces."
      values={{
        docsLink: (
          <EuiLink href={eqlQuerySyntaxDocs} target="_blank">
            {eqlFullName}
          </EuiLink>
        ),
      }}
    />
  );

  const button = (
    <EuiButtonEmpty
      size="xs"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="euiFormControlLayout__append kqlQueryBar__languageSwitcherButton"
      data-test-subj={'switchQueryLanguageButton'}
    >
      {props.language === 'lucene' ? luceneLabel : props.language === 'kuery' ? kqlLabel : eqlLabel}
    </EuiButtonEmpty>
  );

  const languageOptions = [
    {
      id: 'lucene',
      label: luceneLabel,
    },
    {
      id: 'kuery',
      label: kqlLabel,
    },
    {
      id: 'eql',
      label: eqlLabel,
    },
  ];

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
        {props.includeEqlLanguage ? (
          <>
            <EuiForm>
              <EuiRadioGroup
                options={languageOptions}
                idSelected={props.language}
                onChange={props.onSelectLanguage}
                data-test-subj="languageRadioToggle"
                name="Syntax options"
              />
            </EuiForm>
            <EuiHorizontalRule margin="m" />
            <EuiText>
              <p>{kqlDescription}</p>
            </EuiText>
            <EuiText>
              <p>{eqlDescription}</p>
            </EuiText>
          </>
        ) : (
          <>
            <EuiText>
              <p>{kqlDescription}</p>
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
          </>
        )}
      </div>
    </EuiPopover>
  );
});

// eslint-disable-next-line import/no-default-export
export default QueryLanguageSwitcher;
