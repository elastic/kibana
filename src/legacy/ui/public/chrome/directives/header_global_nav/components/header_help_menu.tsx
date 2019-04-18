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

import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import * as Rx from 'rxjs';

import {
  // TODO: add type annotations
  // @ts-ignore
  EuiButton,
  // @ts-ignore
  EuiFlexGroup,
  // @ts-ignore
  EuiFlexItem,
  // @ts-ignore
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { HelpExtension } from 'ui/chrome';
import { metadata } from '../../../../metadata';
import { documentationLinks } from '../../../../documentation_links';

import { HeaderExtension } from './header_extension';

interface Props {
  helpExtension$: Rx.Observable<HelpExtension>;
  intl: InjectedIntl;
  useDefaultContent?: boolean;
  documentationLink?: string;
}

interface State {
  isOpen: boolean;
  helpExtension?: HelpExtension;
}

class HeaderHelpMenuUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      helpExtension: undefined,
    };
  }

  public componentDidMount() {
    this.subscription = this.props.helpExtension$.subscribe({
      next: helpExtension => {
        this.setState({
          helpExtension,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public render() {
    const { intl, useDefaultContent, documentationLink } = this.props;
    const { helpExtension } = this.state;

    const defaultContent = useDefaultContent ? (
      <Fragment>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="common.ui.chrome.headerGlobalNav.helpMenuHelpDescription"
              defaultMessage="Get updates, information, and answers in our documentation."
            />
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiButton iconType="popout" href={documentationLink} target="_blank">
          <FormattedMessage
            id="common.ui.chrome.headerGlobalNav.helpMenuGoToDocumentation"
            defaultMessage="Go to documentation"
          />
        </EuiButton>
      </Fragment>
    ) : null;

    const button = (
      <EuiHeaderSectionItemButton
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={intl.formatMessage({
          id: 'common.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel',
          defaultMessage: 'Help menu',
        })}
        onClick={this.onMenuButtonClick}
      >
        <EuiIcon type="help" size="m" />
      </EuiHeaderSectionItemButton>
    );

    return (
      // @ts-ignore repositionOnScroll doesn't exist in EuiPopover
      <EuiPopover
        id="headerHelpMenu"
        button={button}
        isOpen={this.state.isOpen}
        anchorPosition="downRight"
        repositionOnScroll
        closePopover={this.closeMenu}
        data-test-subj="helpMenuButton"
      >
        <EuiPopoverTitle>
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <FormattedMessage
                id="common.ui.chrome.headerGlobalNav.helpMenuTitle"
                defaultMessage="Help"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="chrHeaderHelpMenu__version">
              <FormattedMessage
                id="common.ui.chrome.headerGlobalNav.helpMenuVersion"
                defaultMessage="v {version}"
                values={{ version: metadata.version }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>

        <div style={{ maxWidth: 240 }}>
          {defaultContent}
          {defaultContent && helpExtension && <EuiSpacer />}
          {helpExtension && <HeaderExtension extension={helpExtension} />}
        </div>
      </EuiPopover>
    );
  }

  private onMenuButtonClick = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  private closeMenu = () => {
    this.setState({
      isOpen: false,
    });
  };
}

export const HeaderHelpMenu = injectI18n(HeaderHelpMenuUI);

HeaderHelpMenu.defaultProps = {
  documentationLink: documentationLinks.kibana,
  useDefaultContent: true,
};
