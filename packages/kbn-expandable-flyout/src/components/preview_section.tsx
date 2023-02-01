/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { useDispatch } from 'react-redux';
import { previousFlyoutPreviewPanel, closeFlyoutPreviewPanel } from '../store/reducers';
import { BACK_BUTTON } from './translations';

interface PreviewSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  width: number | undefined;
  /**
   * Scope
   */
  scope: string;
  /**
   * Show/hide the back button in the header
   */
  showBackButton: boolean;
  /**
   * Width used when rendering the panel
   */
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
  component,
  scope,
  showBackButton,
  width,
}: PreviewSectionProps) => {
  const dispatch = useDispatch();
  const closePreviewPanel = useCallback(
    () => dispatch(closeFlyoutPreviewPanel({ scope })),
    [dispatch, scope]
  );
  const previousPreviewPanel = useCallback(
    () => dispatch(previousFlyoutPreviewPanel({ scope })),
    [dispatch, scope]
  );

  const previewWith: string = width ? `${width}px` : '0px';

  const closeButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon iconType="cross" onClick={closePreviewPanel} />
    </EuiFlexItem>
  );
  const header = showBackButton ? (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          iconSide="left"
          onClick={previousPreviewPanel}
        >
          {BACK_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {closeButton}
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup justifyContent="flexEnd">{closeButton}</EuiFlexGroup>
  );

  return (
    <>
      <div
        css={css`
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: ${previewWith};
          background-color: #242934;
          opacity: 0.5;
        `}
      />
      <div
        css={css`
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: ${previewWith};
          z-index: 1000;
        `}
      >
        <EuiPanel
          css={css`
            margin: 8px;
            height: 100%;
          `}
        >
          {header}
          {component}
        </EuiPanel>
      </div>
    </>
  );
};

PreviewSection.displayName = 'PreviewSection';
