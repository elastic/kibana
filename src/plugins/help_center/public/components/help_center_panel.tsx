/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import './style.scss';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  EuiFlyoutProps,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiSearchBar,
  EuiPanel,
  euiCanAnimate,
  euiFlyoutSlideInRight,
  useEuiTheme,
  EuiButtonIcon,
  EuiText,
  EuiFocusTrap,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { HelpCenterContext } from './help_center_header_nav_button';
import { DocumentationCards } from './documentation_cards';
import { Contact } from './contact';
import { GlobalContent } from './global_content';
import { CustomContent } from './custom_content';
import { DocsGpt, OpenAiLogo } from './docs_gpt';
import { DocumentationTab } from './documentation_tab';
import { ReactElement } from 'react-markdown';

export const HelpCenterPanel = ({
  headerRef,
  username,
}: {
  headerRef: HTMLElement | null;
  username?: string;
}) => {
  const { setFlyoutVisible } = useContext(HelpCenterContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);

  const euiThemeContext = useEuiTheme();
  const euiTheme = euiThemeContext.euiTheme;

  const [panelTitle, setPanelTitle] = useState<ReactElement>(
    <EuiTitle size="m">
      <h2 id="flyoutSmallTitle">
        <FormattedMessage id="helpCenter__flyoutTitle" defaultMessage="Help" />
      </h2>
    </EuiTitle>
  );

  const tabs = useMemo(
    () => [
      {
        id: 'docsGpt',
        name: (
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <OpenAiLogo />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                white-space: nowrap;
              `}
            >
              Docs GPT
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        content: <DocsGpt username={username} />,
      },
      {
        id: 'documentation',
        name: 'Documentation',
        content: <DocumentationTab setPanelTitle={setPanelTitle} />,
      },
      {
        id: 'talkToUs',
        name: 'Contact us',
        content: (
          <>
            <Contact />
          </>
        ),
      },
    ],
    [username]
  );

  const [selectedTabId, setSelectedTabId] = useState('docsGpt');
  const selectedTab = useMemo(
    () => tabs.find((obj) => obj.id === selectedTabId),
    [selectedTabId, tabs]
  );

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
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return headerRef ? (
    <EuiPortal insert={{ sibling: headerRef, position: 'before' }}>
      <EuiFocusTrap
        css={css`
          height: 1px;
          position: absolute;
          top: -1;
          overflow: visible;
        `}
      >
        <Draggable
          handle=".handle"
          bounds="#app-fixed-viewport"
          positionOffset={{ x: 0, y: 96 }}
          defaultPosition={{ x: headerRef.clientWidth - 525, y: -45 }}
        >
          <ResizableBox
            width={500}
            height={700}
            css={css`
              position: fixed !important;
              z-index: 6000;

              min-height: 100px;
              max-width: 100vw;
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
                  z-index: 1000;
                  position: fixed;
                  top: -30px;
                  left: 0px;
                  &:hover {
                    cursor: grab !important;
                  }
                  &:active {
                    cursor: grabbing !important;
                  }
                `}
              />

              <EuiButtonIcon
                color={'text'}
                iconType="cross"
                aria-label="Help"
                display={'fill'}
                onClick={closeFlyout}
                css={css`
                  z-index: 1000;
                  position: fixed;
                  top: -30px;
                  right: 0px;
                `}
              />

              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                responsive={false}
                css={css`
                  height: 100%;
                `}
              >
                <EuiFlexItem grow={false}>
                  {panelTitle}
                  <EuiTabs>{renderTabs()}</EuiTabs>
                  <EuiSpacer size="l" />
                </EuiFlexItem>
                <EuiFlexItem
                  css={
                    selectedTab?.id === 'docsGpt'
                      ? css`
                          overflow: hidden;
                        `
                      : undefined
                  }
                >
                  <div style={{ width: '100%', height: '100%' }}>{selectedTab?.content}</div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </ResizableBox>
        </Draggable>
      </EuiFocusTrap>
    </EuiPortal>
  ) : (
    <></>
  );
};
