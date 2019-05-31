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

import React, { Component } from 'react';

import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiFlexGroup,
} from '@elastic/eui';
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import { EuiFlexItem } from '@elastic/eui';
import { IEmbeddable } from '../../../../';

interface CustomizePanelProps {
  embeddable: IEmbeddable;
  updateTitle: (newTitle: string | undefined) => void;
  intl: InjectedIntl;
}

interface State {
  title: string | undefined;
}

export class CustomizePanelFlyoutUi extends Component<CustomizePanelProps, State> {
  constructor(props: CustomizePanelProps) {
    super(props);
    this.state = {
      title: props.embeddable.getInput().title,
    };
  }

  updateTitle = (title: string | undefined) => {
    this.setState({ title });
  };

  reset = () => {
    this.setState({ title: undefined });
  };

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getTitle()}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFormRow
            label={this.props.intl.formatMessage({
              id: 'kbn.dashboard.panel.optionsMenuForm.panelTitleFormRowLabel',
              defaultMessage: 'Panel title',
            })}
          >
            <EuiFieldText
              id="panelTitleInput"
              data-test-subj="customEmbeddablePanelTitleInput"
              name="min"
              type="text"
              placeholder={this.props.embeddable.getOutput().defaultTitle}
              value={this.state.title || ''}
              onChange={e => this.updateTitle(e.target.value)}
              aria-label={this.props.intl.formatMessage({
                id: 'kbn.embeddable.panel.optionsMenuForm.panelTitleInputAriaLabel',
                defaultMessage: 'Press enter to exit.',
              })}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton data-test-subj="resetCustomEmbeddablePanelTitle" onClick={this.reset}>
                  <FormattedMessage
                    id="kbn.dashboard.panel.optionsMenuForm.resetCustomDashboardButtonLabel"
                    defaultMessage="Reset title"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  fill
                  onClick={() => this.props.updateTitle(this.state.title)}
                  data-test-subj="saveNewTitleButton"
                >
                  <FormattedMessage
                    id="kbn.embeddables.customizePanel.save"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlyoutBody>
      </React.Fragment>
    );
  }
}

export const CustomizePanelFlyout = injectI18n(CustomizePanelFlyoutUi);
