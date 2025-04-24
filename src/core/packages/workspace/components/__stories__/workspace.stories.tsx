/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { Meta } from '@storybook/react';
import { Provider } from 'react-redux';
import { Global, SerializedStyles, css } from '@emotion/react';
import {
  EuiButton,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  tint,
  useEuiTheme,
  EuiTitle,
  EuiText,
  EuiFlyout,
} from '@elastic/eui';

import {
  WorkspaceProvider,
  closeToolbar,
  createStore,
  openToolbar,
  setHasBanner,
  setHasFooter,
  useHasBanner,
  useHasFooter,
  useIsNavigationCollapsed,
  useIsToolbarOpen,
  useWorkspaceDispatch,
  setIsNavigationCollapsed,
} from '@kbn/core-workspace-state';

import { Workspace } from '../workspace';

export default {
  title: 'Workspace/Workspace Elements',
  description: 'Workspace',
  parameters: {},
  decorators: [
    (Story) => {
      const {
        euiTheme: { colors },
      } = useEuiTheme();

      const store = createStore();

      return (
        <Provider store={store}>
          <WorkspaceProvider
            tools={[
              {
                toolId: 'tool',
                button: {
                  iconType: 'wrench',
                },
                tool: {
                  title: 'Tool Name',
                  children: (
                    <Box
                      label="Tool"
                      color={colors.accentSecondary}
                      backgroundColor={colors.textAccentSecondary}
                    />
                  ),
                },
              },
            ]}
          >
            <Global styles={styles} />
            <Story />
          </WorkspaceProvider>
        </Provider>
      );
    },
  ],
} as Meta<typeof Workspace>;

const styles = css`
  body.sb-show-main.sb-main-padded {
    padding: 0;
    overflow-x: hidden;
    min-width: 100%;
    min-height: 100%;
  }
`;

interface BoxProps {
  color: string;
  backgroundColor: string;
  children?: ReactNode;
  label?: string;
  css?: SerializedStyles;
  labelCSS?: SerializedStyles;
}

const Box = ({ color, backgroundColor, css: cssProp, label, children, labelCSS }: BoxProps) => {
  const { euiTheme } = useEuiTheme();

  const rootStyle = css`
    background: ${tint(backgroundColor, 0.85)};
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    color: ${color};
    position: relative;
    overflow: hidden;
    flex-direction: column;
    gap: ${euiTheme.size.m};

    clip-path: polygon(
      6px 2px,
      calc(100% - 6px) 2px,
      calc(100% - 2px) 6px,
      calc(100% - 2px) calc(100% - 6px),
      calc(100% - 6px) calc(100% - 2px),
      6px calc(100% - 2px),
      2px calc(100% - 6px),
      2px 6px
    );

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(
        to bottom right,
        transparent 49%,
        ${color} 49%,
        ${color} 51%,
        transparent 51%
      );
      background-size: 8px 8px;
      pointer-events: none;
      z-index: 0;
    }

    & > * {
      z-index: 1;
    }
    ${cssProp}
  `;

  const labelStyle = css`
    color: ${color};
    background: ${tint(backgroundColor, 0.85)};
    display: block;
    z-index: 1;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    ${labelCSS}
  `;

  return (
    <div css={rootStyle}>
      <span css={labelStyle}>{label}</span>
      {children}
    </div>
  );
};

export const WorkspaceElements = () => {
  const {
    colorMode,
    euiTheme: { colors },
  } = useEuiTheme();

  const dispatch = useWorkspaceDispatch();

  const hasBanner = useHasBanner();
  const hasFooter = useHasFooter();
  const isToolbarOpen = useIsToolbarOpen();
  const isNavCollapsed = useIsNavigationCollapsed();

  const [isFlyoutVisible, setIsFlyoutVisible] = React.useState(false);

  const banner = (
    <Workspace.Banner>
      <Box color={colors.danger} backgroundColor={colors.textDanger} label="Banner" />
    </Workspace.Banner>
  );

  const header = (
    <Workspace.Header>
      <Box
        label="Header"
        color={colors.textParagraph}
        backgroundColor={colors.backgroundFilledText}
        css={css`
          width: 100%;
        `}
      />
    </Workspace.Header>
  );

  const navigation = (
    <Workspace.Navigation>
      <Box
        label="Navigation"
        color={colors.textPrimary}
        backgroundColor={colors.primary}
        labelCSS={
          isNavCollapsed
            ? css`
                transform: translate(-50%, -50%) rotate(-90deg);
              `
            : undefined
        }
      />
    </Workspace.Navigation>
  );

  const toolbar = (
    <Workspace.Toolbar>
      <Box
        label="Toolbar"
        color={colors.accentSecondary}
        backgroundColor={colors.textAccentSecondary}
        labelCSS={css`
          transform: translate(-50%, -50%) rotate(90deg);
        `}
      />
    </Workspace.Toolbar>
  );

  const footer = (
    <Workspace.Footer>
      <Box label="Footer" color={colors.danger} backgroundColor={colors.textDanger} />
    </Workspace.Footer>
  );

  return (
    <>
      <Workspace>
        {{
          banner,
          header,
          navigation,
          application: (
            <Workspace.Application {...{ colorMode }}>
              <Box label="Application" color={colors.textWarning} backgroundColor={colors.warning}>
                <EuiFlexGroup
                  direction="row"
                  gutterSize="m"
                  css={css`
                    flex-grow: 0;
                  `}
                >
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      position: absolute;
                      left: 50%;
                      transform: translateX(-50%);
                      bottom: 8px;
                    `}
                  >
                    <EuiButton
                      onClick={() => dispatch(setHasFooter(!hasFooter))}
                      size="s"
                      color="warning"
                    >
                      {hasFooter ? 'Hide footer' : 'Show footer'}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      position: absolute;
                      left: 50%;
                      transform: translateX(-50%);
                      top: 8px;
                    `}
                  >
                    <EuiButton
                      onClick={() => dispatch(setHasBanner(!hasBanner))}
                      size="s"
                      color="warning"
                    >
                      {hasBanner ? 'Hide banner' : 'Show banner'}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      position: absolute;
                      right: 8px;
                      transform: translateY(-50%);
                      top: 50%;
                    `}
                  >
                    <EuiButton
                      onClick={() => dispatch(isToolbarOpen ? closeToolbar() : openToolbar('tool'))}
                      size="s"
                      color="warning"
                    >
                      {isToolbarOpen ? 'Close toolbar' : 'Open toolbar'}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      position: absolute;
                      left: 8px;
                      transform: translateY(-50%);
                      top: 50%;
                    `}
                  >
                    <EuiButton
                      onClick={() => dispatch(setIsNavigationCollapsed(!isNavCollapsed))}
                      size="s"
                      color="warning"
                    >
                      {isNavCollapsed ? 'Open navigation' : 'Close navigation'}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      position: absolute;
                      left: 50%;
                      transform: translateX(-50%);
                      top: 70%;
                    `}
                  >
                    <EuiButton
                      onClick={() => setIsFlyoutVisible(!isFlyoutVisible)}
                      size="s"
                      color="warning"
                    >
                      {isFlyoutVisible ? 'Hide Flyout' : 'Show Flyout'}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Box>
            </Workspace.Application>
          ),
          toolbar,
          tool: <Workspace.Tool />,
          footer,
        }}
      </Workspace>
      {isFlyoutVisible && (
        <EuiFlyout onClose={() => setIsFlyoutVisible(false)} size="s">
          <EuiFlyoutHeader>
            <EuiTitle>
              <EuiText>Flyout</EuiText>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>This is a flyout.</EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
