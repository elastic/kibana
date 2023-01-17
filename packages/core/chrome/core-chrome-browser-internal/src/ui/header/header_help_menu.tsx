/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeHelpExtension,
  ChromeGlobalHelpExtensionMenuLink,
} from '@kbn/core-chrome-browser';
import { GITHUB_CREATE_ISSUE_LINK, KIBANA_FEEDBACK_LINK } from '../../constants';
import { HeaderExtension } from './header_extension';
import { isModifiedOrPrevented } from './nav_link';

interface Props {
  navigateToUrl: InternalApplicationStart['navigateToUrl'];
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  kibanaVersion: string;
  kibanaDocLink: string;
}

interface State {
  isOpen: boolean;
  helpExtension?: ChromeHelpExtension;
  helpSupportUrl: string;
  globalHelpExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
}

export class HeaderHelpMenu extends Component<Props, State> {
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      helpExtension: undefined,
      helpSupportUrl: '',
      globalHelpExtensionMenuLinks: [],
    };
  }

  public componentDidMount() {
    this.subscription = combineLatest(
      this.props.helpExtension$,
      this.props.helpSupportUrl$,
      this.props.globalHelpExtensionMenuLinks$
    ).subscribe(([helpExtension, helpSupportUrl, globalHelpExtensionMenuLinks]) => {
      this.setState({
        helpExtension,
        helpSupportUrl,
        globalHelpExtensionMenuLinks,
      });
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public render() {
    const { kibanaVersion } = this.props;

    const defaultContent = this.renderDefaultContent();
    const globalCustomContent = this.renderGlobalCustomContent();
    const customContent = this.renderCustomContent();

    const button = (
      <EuiHeaderSectionItemButton
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
          defaultMessage: 'Help menu',
        })}
        onClick={this.onMenuButtonClick}
      >
        <EuiIcon type="help" size="m" />
      </EuiHeaderSectionItemButton>
    );

    return (
      <EuiPopover
        anchorPosition="downRight"
        button={button}
        closePopover={this.closeMenu}
        data-test-subj="helpMenuButton"
        id="headerHelpMenu"
        isOpen={this.state.isOpen}
        repositionOnScroll
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
          {globalCustomContent}
          {defaultContent}
          {(defaultContent || customContent) && <EuiHorizontalRule margin="m" />}
          {customContent}
        </div>
      </EuiPopover>
    );
  }

  private renderDefaultContent() {
    const { kibanaDocLink } = this.props;
    const { helpSupportUrl } = this.state;

    return (
      <Fragment>
        <EuiButtonEmpty href={kibanaDocLink} target="_blank" size="s" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle"
            defaultMessage="Kibana documentation"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty href={helpSupportUrl} target="_blank" size="s" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle"
            defaultMessage="Ask Elastic Support"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty href={KIBANA_FEEDBACK_LINK} target="_blank" size="s" flush="left">
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackTitle"
            defaultMessage="Give feedback"
          />
        </EuiButtonEmpty>

        <EuiSpacer size="xs" />

        <EuiButtonEmpty
          href={GITHUB_CREATE_ISSUE_LINK}
          target="_blank"
          size="s"
          iconType="logoGithub"
          flush="left"
        >
          <FormattedMessage
            id="core.ui.chrome.headerGlobalNav.helpMenuOpenGitHubIssueTitle"
            defaultMessage="Open an issue in GitHub"
          />
        </EuiButtonEmpty>
      </Fragment>
    );
  }

  private renderGlobalCustomContent() {
    const { navigateToUrl } = this.props;
    const { globalHelpExtensionMenuLinks } = this.state;

    return globalHelpExtensionMenuLinks
      .sort((a, b) => b.priority - a.priority)
      .map((link, index) => {
        const { linkType, content: text, href, external, ...rest } = link;
        return createCustomLink(index, text, true, {
          href,
          onClick: external ? undefined : this.createOnClickHandler(href, navigateToUrl),
          ...rest,
        });
      });
  }

  private renderCustomContent() {
    const { helpExtension } = this.state;
    if (!helpExtension) {
      return null;
    }
    const { navigateToUrl } = this.props;
    const { appName, links, content } = helpExtension;

    const getFeedbackText = () =>
      i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackOnApp', {
        defaultMessage: 'Give feedback on {appName}',
        values: { appName: helpExtension.appName },
      });

    const customLinks =
      links &&
      links.map((link, index) => {
        const addSpacer = index < links.length - 1;
        switch (link.linkType) {
          case 'documentation': {
            const { linkType, ...rest } = link;
            return createCustomLink(
              index,
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuDocumentation"
                defaultMessage="Documentation"
              />,
              addSpacer,
              {
                target: '_blank',
                rel: 'noopener',
                ...rest,
              }
            );
          }
          case 'github': {
            const { linkType, labels, title, ...rest } = link;
            return createCustomLink(index, getFeedbackText(), addSpacer, {
              iconType: 'logoGithub',
              href: createGithubUrl(labels, title),
              target: '_blank',
              rel: 'noopener',
              ...rest,
            });
          }
          case 'discuss': {
            const { linkType, ...rest } = link;
            return createCustomLink(index, getFeedbackText(), addSpacer, {
              iconType: 'editorComment',
              target: '_blank',
              rel: 'noopener',
              ...rest,
            });
          }
          case 'custom': {
            const { linkType, content: text, href, external, ...rest } = link;
            return createCustomLink(index, text, addSpacer, {
              href,
              onClick: this.createOnClickHandler(href, navigateToUrl),
              ...rest,
            });
          }
          default:
            break;
        }
      });

    return (
      <>
        <EuiTitle size="xxs">
          <h3>{appName}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {customLinks}
        {content && (
          <>
            {customLinks && <EuiSpacer size="xs" />}
            <HeaderExtension
              extension={(domNode) => content(domNode, { hideHelpMenu: this.closeMenu })}
            />
          </>
        )}
      </>
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

  private createOnClickHandler(href: string, navigate: Props['navigateToUrl']) {
    return (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (!isModifiedOrPrevented(event) && event.button === 0) {
        event.preventDefault();
        this.closeMenu();
        navigate(href);
      }
    };
  }
}

const createGithubUrl = (labels: string[], title?: string) => {
  const url = new URL('https://github.com/elastic/kibana/issues/new?');

  if (labels.length) {
    url.searchParams.set('labels', labels.join(','));
  }

  if (title) {
    url.searchParams.set('title', title);
  }

  return url.toString();
};

const createCustomLink = (
  index: number,
  text: React.ReactNode,
  addSpacer?: boolean,
  buttonProps?: EuiButtonEmptyProps
) => {
  return (
    <Fragment key={`helpButton${index}`}>
      <EuiButtonEmpty {...buttonProps} size="s" flush="left">
        {text}
      </EuiButtonEmpty>
      {addSpacer && <EuiSpacer size="xs" />}
    </Fragment>
  );
};
