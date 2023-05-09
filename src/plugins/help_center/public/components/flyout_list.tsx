/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Draggable from 'react-draggable';
import { Resizable, ResizableBox } from 'react-resizable';
import './style.scss';
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
  euiCanAnimate,
  euiFlyoutSlideInRight,
  useEuiTheme,
  EuiButtonIcon,
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

  const euiThemeContext = useEuiTheme();
  const euiTheme = euiThemeContext.euiTheme;

  const globalCustomContent = useMemo(() => {
    return helpLinks?.globalHelpExtensionMenuLinks
      ?.sort((a, b) => b.priority - a.priority)
      .map((link, index) => {
        const { content: text, href, image, description } = link;
        return (
          <EuiPanel>
            <EuiFlexGroup
              alignItems="center"
              responsive={true}
              css={css`
                width: 100%;
                height: 100%;
              `}
            >
              <EuiFlexItem grow={2}>
                <EuiText>
                  <h2>{text}</h2>
                  <p>{description}</p>
                  <EuiButton target="_blank" color="primary" fill href={href}>
                    Get started!
                  </EuiButton>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiImage size="fill" src={image} alt="" />
              </EuiFlexItem>
            </EuiFlexGroup>
            {/* <EuiSplitPanel.Inner paddingSize="l" grow={true}>
              <EuiText>
                <h2>{text}</h2>
                <p>{description}</p>
                <EuiButton target="_blank" color="primary" fill href={href}>
                  Get started!
                </EuiButton>
              </EuiText>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner grow={false}>
              <EuiImage size="l" src={image} alt="" />
            </EuiSplitPanel.Inner> */}
          </EuiPanel>
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
            <DocumentationCards />
            <EuiSpacer size="m" />
            {helpLinks?.globalHelpExtensionMenuLinks && globalCustomContent}
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
      <div
        css={css`
          width: 100%;
          height: calc(100% - 96px);
          position: fixed;
          top: 96px;
          left: 0px;
          padding: 20px;
          z-index: 1000;
        `}
      >
        <Draggable handle=".handle" bounds="parent" positionOffset={{ x: 0, y: 0 }}>
          <ResizableBox
            width={400}
            height={400}
            css={css`
              position: absolute;
              top: 0px;
              left: calc(100% - 400px);

              min-height: 100px;
              max-height: 100%;
              max-width: 100%;
            `}
          >
            <EuiPanel
              paddingSize="l"
              css={css`
                width: 100%;
                height: 100%;

                ${euiCanAnimate} {
                  animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal}
                    ${euiTheme.animation.resistance};
                }
              `}
              aria-labelledby="flyoutSmallTitle"
              className="eui-yScroll"
              data-test-subj="HelpCenterFlyout"
            >
              <EuiButtonIcon
                className="handle"
                color={'text'}
                onClick={() => {}}
                iconType="grab"
                aria-label="Help"
                display={'fill'}
                css={css`
                  position: fixed;
                  top: -30px;
                  left: 0px;
                  cursor: 'grabbing';
                `}
              />

              <EuiButtonIcon
                color={'text'}
                iconType="cross"
                aria-label="Help"
                display={'fill'}
                onClick={closeFlyout}
                css={css`
                  position: fixed;
                  top: -30px;
                  right: 0px;
                `}
              />

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
          </ResizableBox>
        </Draggable>
      </div>
    </EuiPortal>
  );
};
