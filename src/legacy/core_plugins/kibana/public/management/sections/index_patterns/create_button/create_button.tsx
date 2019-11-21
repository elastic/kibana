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

// @ts-ignore
import { euiColorAccent } from '@elastic/eui/dist/eui_theme_light.json';
import React, { Component, Fragment } from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiPopover,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';

interface State {
  isPopoverOpen: boolean;
}

interface Props {
  options: Array<{
    text: string;
    description?: string;
    testSubj?: string;
    isBeta?: boolean;
    onClick: () => void;
  }>;
  uiCapabilities: UICapabilities;
}

class CreateButtonComponent extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const { options, children, uiCapabilities } = this.props;
    const { isPopoverOpen } = this.state;

    if (!options || !options.length) {
      return null;
    }

    if (!uiCapabilities.indexPatterns.save) {
      return null;
    }

    if (options.length === 1) {
      return (
        <EuiButton
          data-test-subj="createIndexPatternButton"
          fill={true}
          onClick={options[0].onClick}
          iconType="plusInCircle"
        >
          {children}
        </EuiButton>
      );
    }

    const button = (
      <EuiButton
        data-test-subj="createIndexPatternButton"
        fill={true}
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.togglePopover}
      >
        {children}
      </EuiButton>
    );

    if (options.length > 1) {
      return (
        <EuiPopover
          id="singlePanel"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            items={options.map(option => {
              return (
                <EuiContextMenuItem
                  key={option.text}
                  onClick={option.onClick}
                  data-test-subj={option.testSubj}
                >
                  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }}>
                    <EuiDescriptionListTitle>
                      {option.text}
                      {option.isBeta ? <Fragment> {this.renderBetaBadge()}</Fragment> : null}
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {option.description}
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiContextMenuItem>
              );
            })}
          />
        </EuiPopover>
      );
    }
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

  private renderBetaBadge = () => {
    return (
      <EuiBadge color={euiColorAccent}>
        <FormattedMessage
          id="kbn.management.indexPatternList.createButton.betaLabel"
          defaultMessage="Beta"
        />
      </EuiBadge>
    );
  };
}

export const CreateButton = injectUICapabilities(CreateButtonComponent);
