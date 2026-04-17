/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiThemeProvider,
  EuiToolTip,
  EuiWindowEvent,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { isMac } from '@kbn/shared-ux-utility';
import { useDesignerMinimized } from '../hooks/use_designer_minimized';

const HEIGHT = 32;
const TOOLBAR_BACKGROUND_COLOR = 'rgb(92, 61, 110)';

export interface DesignerToolbarLabels {
  title: string;
  expandToolbar: string;
  minimizeToolbar: string;
  hideToolbar: string;
  annotate: string;
  removeAllAnnotations: string;
  showOverlay: string;
  hideOverlay: string;
  configEnabledHint: string;
}

export interface DesignerToolbarProps {
  labels: DesignerToolbarLabels;
  onAnnotate: () => void;
  onRemoveAllAnnotations: () => void;
  onToggleCanvasVisible: () => void;
  canvasVisible: boolean;
}

const minimizedAttentionPop = keyframes`
  0%   { transform: scale(1); }
  15%  { transform: scale(1.15); }
  70%  { transform: scale(0.97); }
  100% { transform: scale(1); }
`;

const getMinimizedToolbarStyles = (
  euiTheme: EuiThemeComputed,
  backgroundColor: string,
  shouldPop: boolean
) => [
  css`
    display: inline-block;
    background-color: ${backgroundColor};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.xxs};
  `,
  shouldPop &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        animation: ${minimizedAttentionPop} 450ms ease-out 0s 1;
      }
    `,
  css`
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
];

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: 0;
  background-color: ${TOOLBAR_BACKGROUND_COLOR};
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
`;

const getToolbarContainerStyles = () => css`
  height: ${HEIGHT}px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
`;

const MinimizedDesignerToolbarButton: React.FC<{
  keyboardShortcutLabel: string;
  onExpand: () => void;
  onHide: () => void;
  labels: DesignerToolbarLabels;
}> = ({ keyboardShortcutLabel, onExpand, onHide, labels }) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.animationName = 'none';
    void el.offsetHeight;
    el.style.animationName = '';
  }, [onExpand]);

  return (
    <div ref={containerRef} css={getMinimizedToolbarStyles(euiTheme, TOOLBAR_BACKGROUND_COLOR, false)}>
      <EuiToolTip
        content={
          <>
            {labels.expandToolbar} {keyboardShortcutLabel}
            <br />
            {labels.hideToolbar}
            <br />
            <em>{labels.configEnabledHint}</em>
          </>
        }
        disableScreenReaderOutput={true}
      >
        <EuiButtonIcon
          color="text"
          iconType="brush"
          size="xs"
          onClick={onExpand}
          onContextMenu={(e: React.MouseEvent) => {
            onHide();
            e.preventDefault();
          }}
          aria-label={labels.expandToolbar}
          data-test-subj="designerToolbarMinimizedButton"
        />
      </EuiToolTip>
    </div>
  );
};

export const DesignerToolbar: React.FC<DesignerToolbarProps> = (props) => {
  return (
    <EuiThemeProvider colorMode="dark">
      <DesignerToolbarInternal {...props} />
    </EuiThemeProvider>
  );
};

const DesignerToolbarInternal: React.FC<DesignerToolbarProps> = ({
  labels,
  onAnnotate,
  onRemoveAllAnnotations,
  onToggleCanvasVisible,
  canvasVisible,
}) => {
  const { euiTheme } = useEuiTheme();
  const { isMinimized, toggleMinimized } = useDesignerMinimized();
  const [isHidden, setIsHidden] = useState(false);

  const keyboardShortcutLabel = isMac ? '⌘+/' : 'Ctrl+/';


  const handleShortcut = (
    <EuiWindowEvent
      event="keydown"
      handler={(e) => {
        if (isToggleShortcut(e)) {
          e.preventDefault();
          setIsHidden(false);
          toggleMinimized();
        }
      }}
    />
  );

  if (isHidden) return <>{handleShortcut}</>;

  if (isMinimized) {
    return (
      <>
        {handleShortcut}
        <MinimizedDesignerToolbarButton
          keyboardShortcutLabel={keyboardShortcutLabel}
          onExpand={toggleMinimized}
          onHide={() => setIsHidden(true)}
          labels={labels}
        />
      </>
    );
  }

  return (
    <div css={getToolbarContainerStyles()}>
      {handleShortcut}
      <EuiPanel css={getToolbarPanelStyles(euiTheme)} hasShadow={false} hasBorder={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <>
                      {labels.minimizeToolbar} {keyboardShortcutLabel}
                      <br />
                      {labels.hideToolbar}
                    </>
                  }
                >
                  <EuiButtonIcon
                    iconType="minimize"
                    size="xs"
                    color="text"
                    onClick={toggleMinimized}
                    onContextMenu={(e: React.MouseEvent) => {
                      setIsHidden(true);
                      e.preventDefault();
                    }}
                    aria-label={labels.minimizeToolbar}
                    data-test-subj="designerToolbarMinimizeButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span
                  css={css`
                    color: #fff;
                    font-size: ${euiTheme.size.m};
                    font-weight: 700;
                  `}
                >
                  {labels.title}
                </span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={labels.annotate}>
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    iconType="editorComment"
                    onClick={onAnnotate}
                    data-test-subj="designerToolbarAnnotateButton"
                  >
                    {labels.annotate}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={labels.removeAllAnnotations}>
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    iconType="trash"
                    onClick={onRemoveAllAnnotations}
                    data-test-subj="designerToolbarRemoveAllButton"
                  >
                    {labels.removeAllAnnotations}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={canvasVisible ? labels.hideOverlay : labels.showOverlay}>
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    iconType={canvasVisible ? 'eyeClosed' : 'eye'}
                    onClick={onToggleCanvasVisible}
                    data-test-subj="designerToolbarToggleCanvasButton"
                  >
                    {canvasVisible ? labels.hideOverlay : labels.showOverlay}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};

const isToggleShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.key === '/';
