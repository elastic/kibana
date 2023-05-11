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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { HelpCenterContext } from './help_center_header_nav_button';
import { DocumentationCards } from './documentation_cards';
import { Contact } from './contact';
import { GlobalContent } from './global_content';
import { CustomContent } from './custom_content';

export const HelpCenterFlyout = ({ headerRef }: { headerRef: HTMLElement | null }) => {
  const { setFlyoutVisible, kibanaVersion } = useContext(HelpCenterContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);

  const euiThemeContext = useEuiTheme();
  const euiTheme = euiThemeContext.euiTheme;

  const tabs = useMemo(
    () => [
      {
        id: 'documentation',
        name: 'Documentation',
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
            <CustomContent />
            <DocumentationCards />
            <EuiSpacer size="m" />
            <GlobalContent />
          </>
        ),
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
    []
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
          defaultPosition={{ x: headerRef.clientWidth - 425, y: -45 }}
        >
          <ResizableBox
            width={420}
            height={420}
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

              <EuiTitle size="m">
                <h2 id="flyoutSmallTitle">
                  <FormattedMessage id="helpCenter__flyoutTitle" defaultMessage="Help" />
                </h2>
              </EuiTitle>

              <EuiTabs>{renderTabs()}</EuiTabs>
              <EuiSpacer size="l" />
              <div style={{ width: '100%' }}>{selectedTabContent}</div>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="s">
                    <p>
                      <FormattedMessage
                        id="HelpCenter.flyoutList.versionTextLabel"
                        defaultMessage="{version}"
                        values={{ version: `Version ${kibanaVersion}` }}
                      />
                    </p>
                  </EuiText>
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
