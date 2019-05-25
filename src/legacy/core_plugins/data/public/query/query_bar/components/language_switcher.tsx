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
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

const kueryQuerySyntaxDocs = documentationLinks.query.kueryQuerySyntax;

interface State {
  isPopoverOpen: boolean;
}

interface Props {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
}

export class QueryLanguageSwitcher extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
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
      <EuiButtonEmpty size="xs" onClick={this.togglePopover}>
        {this.props.language === 'lucene' ? luceneLabel : kqlLabel}
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="popover"
        className="eui-displayBlock"
        ownFocus
        anchorPosition="downRight"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        withTitle
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
                  this.props.language === 'kuery' ? (
                    <FormattedMessage id="data.query.queryBar.kqlOnLabel" defaultMessage="On" />
                  ) : (
                    <FormattedMessage id="data.query.queryBar.kqlOffLabel" defaultMessage="Off" />
                  )
                }
                checked={this.props.language === 'kuery'}
                onChange={this.onSwitchChange}
                data-test-subj="languageToggle"
              />
            </EuiFormRow>
          </EuiForm>
        </div>
      </EuiPopover>
    );
  }

  private togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  private onSwitchChange = () => {
    const newLanguage = this.props.language === 'lucene' ? 'kuery' : 'lucene';
    this.props.onSelectLanguage(newLanguage);
  };
}
