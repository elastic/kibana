/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Draggable from 'react-draggable';
// import { Resizable } from 'react-resizable';
import React, { Fragment, useCallback, useContext, useMemo, useState } from 'react';
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
  EuiTab,
  EuiTabs,
  EuiImage,
  EuiButton,
  EuiSearchBar,
  EuiSplitPanel,
  EuiPanel,
  EuiOverlayMask,
  EuiFocusTrap,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GITHUB_CREATE_ISSUE_LINK,
  KIBANA_FEEDBACK_LINK,
} from '@kbn/core-chrome-browser-internal/src/constants';
import { HelpCenterContext } from './help_center_header_nav_button';
import { DocumentationCards } from './documentation_cards';
import { css } from '@emotion/react';

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
        const { content: text, href, image, description } = link;
        return (
          <EuiSplitPanel.Outer
            direction="row"
            css={css`
              padding-top: 16px;
              padding-bottom: 16px;
            `}
          >
            <EuiSplitPanel.Inner paddingSize="l">
              <EuiText>
                <h2>{text}</h2>
                <p>{description}</p>
                <EuiButton target="_blank" color="primary" fill href={href}>
                  Get started!
                </EuiButton>
              </EuiText>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner>
              <EuiImage size="fullWidth" src={image} alt="" />
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        );
      });
  }, [helpLinks?.globalHelpExtensionMenuLinks]);

  const tabs = useMemo(
    () => [
      {
        id: 'documentation',
        name: 'Documentation',
        prepend: <EuiIcon type="documentation" />,
        content: (
          <>
            <EuiSearchBar
            // defaultQuery={initialQuery}
            // box={{
            //   placeholder: 'type:visualization -is:active joe',
            //   incremental,
            //   schema,
            // }}
            // filters={filters}
            // onChange={onChange}
            />
            <EuiSpacer size="m" />
            {helpLinks?.globalHelpExtensionMenuLinks && globalCustomContent}
            <EuiSpacer size="m" />
            <DocumentationCards />
          </>
        ),
      },
      {
        id: 'feedback',
        name: 'Feedback',
        prepend: <EuiIcon type="discuss" />,
        content: (
          <Fragment>
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
          </Fragment>
        ),
      },
    ],
    [globalCustomContent, helpLinks?.globalHelpExtensionMenuLinks, helpLinks?.helpSupportLink]
  );

  const [selectedTabId, setSelectedTabId] = useState('documentation');
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [tabs, selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        css={css`
          padding-left: 0px;
          padding-right: 8px;
        `}
        prepend={tab.prepend}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <EuiPortal>
      {/* <EuiFocusTrap onClickOutside={closeFlyout}> */}
      <Draggable>
        <EuiPanel
          paddingSize="l"
          // {...rest}
          // onClose={closeFlyout}
          // size="m"
          css={css`
            min-width: 50vw;
            height: 90vh;
            position: fixed;
            max-height: 76vh;
            max-inline-size: 480px;
            max-block-size: auto;
            inset-inline-end: 46px;
            inset-block-start: 128px;
          `}
          aria-labelledby="flyoutSmallTitle"
          className="eui-yScroll"
          data-test-subj="HelpCenterFlyout"
        >
          <EuiTitle size="s">
            <h2 id="flyoutSmallTitle">
              <FormattedMessage id="helpCenter__flyoutTitle" defaultMessage="Help" />
            </h2>
          </EuiTitle>

          <EuiTabs>{renderTabs()}</EuiTabs>
          <EuiSpacer size="l" />

          {selectedTabContent}

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
          {/* </div> */}
        </EuiPanel>
      </Draggable>
    </EuiPortal>
  );
};
