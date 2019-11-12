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

import * as Rx from 'rxjs';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';

import { HeaderExtension } from './header_extension';
import { ChromeHelpExtension } from '../../chrome_service';
import {
  ELASTIC_SUPPORT_LINK,
  GITHUB_CREATE_ISSUE_LINK,
  KIBANA_ASK_ELASTIC_LINK,
  KIBANA_FEEDBACK_LINK,
} from '../../constants';

interface Props {
  helpExtension$: Rx.Observable<ChromeHelpExtension | undefined>;
  intl: InjectedIntl;
  kibanaVersion: string;
  useDefaultContent?: boolean;
  kibanaDocLink: string;
  isCloudEnabled: boolean;
}

interface State {
  isOpen: boolean;
  helpExtension?: ChromeHelpExtension;
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
    const { intl, kibanaVersion, useDefaultContent, kibanaDocLink } = this.props;
    const { helpExtension } = this.state;

    const defaultContent = useDefaultContent ? (
      <Fragment>
        <EuiButtonEmpty href={kibanaDocLink} target="_blank" size="xs" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle"
            defaultMessage="Kibana documentation"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty
          href={this.props.isCloudEnabled ? ELASTIC_SUPPORT_LINK : KIBANA_ASK_ELASTIC_LINK}
          target="_blank"
          size="xs"
          flush="left"
        >
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle"
            defaultMessage="Ask Elastic"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty href={KIBANA_FEEDBACK_LINK} target="_blank" size="xs" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackTitle"
            defaultMessage="Give feedback"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty
          href={GITHUB_CREATE_ISSUE_LINK}
          target="_blank"
          size="xs"
          iconType="logoGithub"
          flush="left"
        >
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuOpenGitHubIssueTitle"
            defaultMessage="Open an issue in GitHub"
          />
        </EuiButtonEmpty>
      </Fragment>
    ) : null;

    const button = (
      <EuiHeaderSectionItemButton
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={intl.formatMessage({
          id: 'core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel',
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
                id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                defaultMessage="Help"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="chrHeaderHelpMenu__version">
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                defaultMessage="v {version}"
                values={{ version: kibanaVersion }}
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
  useDefaultContent: true,
};
