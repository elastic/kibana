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
import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { InjectedIntl, injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

import { ExclusiveUnion } from '@elastic/eui';
import { combineLatest } from 'rxjs';
import { HeaderExtension } from './header_extension';
import { ChromeHelpExtension } from '../../chrome_service';
import { GITHUB_CREATE_ISSUE_LINK, KIBANA_FEEDBACK_LINK } from '../../constants';

/** @public */
export type ChromeHelpExtensionMenuGitHubLink = EuiButtonEmptyProps & {
  /**
   * Creates a link to a new github issue in the Kibana repo
   */
  linkType: 'github';
  /**
   * Include at least one app-specific label to be applied to the new github issue
   */
  labels: string[];
  /**
   * Provides initial text for the title of the issue
   */
  title?: string;
};

/** @public */
export type ChromeHelpExtensionMenuDiscussLink = EuiButtonEmptyProps & {
  /**
   * Creates a generic give feedback link with comment icon
   */
  linkType: 'discuss';
  /**
   * URL to discuss page.
   * i.e. `https://discuss.elastic.co/c/${appName}`
   */
  href: string;
};

/** @public */
export type ChromeHelpExtensionMenuDocumentationLink = EuiButtonEmptyProps & {
  /**
   * Creates a deep-link to app-specific documentation
   */
  linkType: 'documentation';
  /**
   * URL to documentation page.
   * i.e. `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${appName}.html`,
   */
  href: string;
};

/** @public */
export type ChromeHelpExtensionMenuCustomLink = EuiButtonEmptyProps & {
  /**
   * Extend EuiButtonEmpty to provide extra functionality
   */
  linkType: 'custom';
  /**
   * Content of the button (in lieu of `children`)
   */
  content: React.ReactNode;
};

/** @public */
export type ChromeHelpExtensionMenuLink = ExclusiveUnion<
  ChromeHelpExtensionMenuGitHubLink,
  ExclusiveUnion<
    ChromeHelpExtensionMenuDiscussLink,
    ExclusiveUnion<ChromeHelpExtensionMenuDocumentationLink, ChromeHelpExtensionMenuCustomLink>
  >
>;

interface Props {
  helpExtension$: Rx.Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Rx.Observable<string>;
  intl: InjectedIntl;
  kibanaVersion: string;
  useDefaultContent?: boolean;
  kibanaDocLink: string;
}

interface State {
  isOpen: boolean;
  helpExtension?: ChromeHelpExtension;
  helpSupportUrl: string;
}

class HeaderHelpMenuUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      helpExtension: undefined,
      helpSupportUrl: '',
    };
  }

  public componentDidMount() {
    this.subscription = combineLatest(
      this.props.helpExtension$,
      this.props.helpSupportUrl$
    ).subscribe(([helpExtension, helpSupportUrl]) => {
      this.setState({
        helpExtension,
        helpSupportUrl,
      });
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  createGithubUrl = (labels: string[], title?: string) => {
    const url = new URL('https://github.com/elastic/kibana/issues/new?');

    if (labels.length) {
      url.searchParams.set('labels', labels.join(','));
    }

    if (title) {
      url.searchParams.set('title', title);
    }

    return url.toString();
  };

  createCustomLink = (
    index: number,
    text: React.ReactNode,
    addSpacer?: boolean,
    buttonProps?: EuiButtonEmptyProps
  ) => {
    return (
      <Fragment key={`helpButton${index}`}>
        <EuiButtonEmpty {...buttonProps} size="xs" flush="left">
          {text}
        </EuiButtonEmpty>
        {addSpacer && <EuiSpacer size="xs" />}
      </Fragment>
    );
  };

  public render() {
    const { intl, kibanaVersion, useDefaultContent, kibanaDocLink } = this.props;
    const { helpExtension, helpSupportUrl } = this.state;

    const defaultContent = useDefaultContent ? (
      <Fragment>
        <EuiButtonEmpty href={kibanaDocLink} target="_blank" size="xs" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle"
            defaultMessage="Kibana documentation"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty href={helpSupportUrl} target="_blank" size="xs" flush="left">
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

    let customContent;
    if (helpExtension) {
      const { appName, links, content } = helpExtension;

      const getFeedbackText = () =>
        i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackOnApp', {
          defaultMessage: 'Give feedback on {appName}',
          values: { appName: helpExtension.appName },
        });

      const customLinks =
        links &&
        links.map((link, index) => {
          const { linkType, title, labels = [], content: text, ...rest } = link;
          switch (linkType) {
            case 'documentation':
              return this.createCustomLink(
                index,
                <FormattedMessage
                  id="core.ui.chrome.headerGlobalNav.helpMenuDocumentation"
                  defaultMessage="Documentation"
                />,
                index < links.length - 1,
                {
                  target: '_blank',
                  rel: 'noopener',
                  ...rest,
                }
              );
            case 'github':
              return this.createCustomLink(index, getFeedbackText(), index < links.length - 1, {
                iconType: 'logoGithub',
                href: this.createGithubUrl(labels, title),
                target: '_blank',
                rel: 'noopener',
                ...rest,
              });
            case 'discuss':
              return this.createCustomLink(index, getFeedbackText(), index < links.length - 1, {
                iconType: 'editorComment',
                target: '_blank',
                rel: 'noopener',
                ...rest,
              });
            case 'custom':
              return this.createCustomLink(index, text, index < links.length - 1, { ...rest });
            default:
              break;
          }
        });

      customContent = (
        <>
          <EuiTitle size="xxs">
            <h3>{appName}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {customLinks}
          {content && (
            <>
              {customLinks && <EuiSpacer size="s" />}
              <HeaderExtension extension={content} />
            </>
          )}
        </>
      );
    }

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
              <h2>
                <FormattedMessage
                  id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                  defaultMessage="Help"
                />
              </h2>
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
          {defaultContent && customContent && <EuiHorizontalRule margin="m" />}
          {customContent}
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
