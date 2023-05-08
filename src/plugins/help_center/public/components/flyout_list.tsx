/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiPortal,
  EuiSpacer,
  EuiIcon,
  EuiCard,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GITHUB_CREATE_ISSUE_LINK,
  KIBANA_FEEDBACK_LINK,
} from '@kbn/core-chrome-browser-internal/src/constants';
import { HelpCenterContext } from './help_center_header_nav_button';
import { DocumentationCards } from './documentation_cards';

export const HelpCenterFlyout = (
  props: Partial<EuiFlyoutProps> & { showPlainSpinner: boolean }
) => {
  const { newsFetchResult, setFlyoutVisible, helpLinks } = useContext(HelpCenterContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);
  const { showPlainSpinner, ...rest } = props;
  // console.log(helpLinks);

  const globalCustomContent = useMemo(() => {
    return helpLinks?.globalHelpExtensionMenuLinks
      ?.sort((a, b) => b.priority - a.priority)
      .map((link, index) => {
        const { linkType, content: text, href, external, ...restProps } = link;
        return (
          <EuiButtonEmpty
            key={`customLink_${index}`}
            href={href}
            target="_blank"
            size="s"
            flush="left"
            {...restProps}
          >
            {text}
          </EuiButtonEmpty>
        );
      });
  }, [helpLinks?.globalHelpExtensionMenuLinks]);

  return (
    <EuiPortal>
      <EuiFlyout
        {...rest}
        onClose={closeFlyout}
        size="m"
        aria-labelledby="flyoutSmallTitle"
        className="kbnNews__flyout"
        data-test-subj="HelpCenterFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2 id="flyoutSmallTitle">
                  <FormattedMessage id="helpCenter__flyoutTitle" defaultMessage="Help" />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {newsFetchResult ? (
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="HelpCenter.flyoutList.versionTextLabel"
                      defaultMessage="{version}"
                      values={{ version: `Version ${newsFetchResult.kibanaVersion}` }}
                    />
                  </p>
                </EuiText>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody className={'kbnNews__flyoutAlerts'}>
          <DocumentationCards />

          <EuiSpacer size="l" />

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

          <EuiSpacer size="xs" />

          <EuiButtonEmpty
            iconType={'questionInCircle'}
            href={helpLinks?.helpSupportLink}
            target="_blank"
            size="s"
            flush="left"
          >
            <FormattedMessage
              id="core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle"
              defaultMessage="Ask Elastic"
            />
          </EuiButtonEmpty>

          <EuiSpacer size="xs" />

          {helpLinks?.globalHelpExtensionMenuLinks && globalCustomContent}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                <FormattedMessage
                  id="HelpCenter.flyoutList.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType={'discuss'}
                href={KIBANA_FEEDBACK_LINK}
                target="_blank"
                size="s"
                flush="left"
              >
                <FormattedMessage
                  id="core.ui.chrome.headerGlobalNav.helpMenuGiveFeedbackTitle"
                  defaultMessage="Give feedback"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
