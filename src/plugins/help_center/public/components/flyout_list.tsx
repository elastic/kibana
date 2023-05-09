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
import React, { Fragment, useCallback, useContext, useMemo, useState } from 'react';
import {
  EuiFlyoutProps,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  EuiSpacer,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiSearchBar,
  EuiPanel,
  euiCanAnimate,
  euiFlyoutSlideInRight,
  useEuiTheme,
  EuiButtonIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { HelpCenterContext } from './help_center_header_nav_button';
import { DocumentationCards } from './documentation_cards';
import { Contact } from './contact';
import { GlobalContent } from './global_content';

export const HelpCenterFlyout = (
  props: Partial<EuiFlyoutProps> & { showPlainSpinner: boolean }
) => {
  const { setFlyoutVisible, kibanaVersion } = useContext(HelpCenterContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);
  const { showPlainSpinner, ...rest } = props;

  const euiThemeContext = useEuiTheme();
  const euiTheme = euiThemeContext.euiTheme;

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
            <GlobalContent />
          </>
        ),
      },
      {
        id: 'talkToUs',
        name: 'Contact us',
        prepend: <EuiIcon type="discuss" />,
        content: (
          <Fragment>
            <Contact />
          </Fragment>
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
      </div>
    </EuiPortal>
  );
};
