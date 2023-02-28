/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import {
  PREVIEW_SECTION,
  PREVIEW_SECTION_BACK_BUTTON,
  PREVIEW_SECTION_CLOSE_BUTTON,
} from './test_ids';
import { useExpandableFlyoutContext } from '../..';
import { BACK_BUTTON, CLOSE_BUTTON } from './translations';

interface PreviewSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Width used when rendering the panel
   */
  width: number | undefined;
  /**
   * Display the back button in the header
   */
  showBackButton: boolean;
}

/**
 * Preview section of the expanded flyout rendering one or multiple panels.
 * Will display a back and close button in the header for the previous and close feature respectively.
 */
export const PreviewSection: React.FC<PreviewSectionProps> = ({
  component,
  showBackButton,
  width,
}: PreviewSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const { closePreviewPanel, previousPreviewPanel } = useExpandableFlyoutContext();

  const previewWith: string = width ? `${width}px` : '0px';

  const closeButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="cross"
        onClick={() => closePreviewPanel()}
        data-test-subj={PREVIEW_SECTION_CLOSE_BUTTON}
        aria-label={CLOSE_BUTTON}
      />
    </EuiFlexItem>
  );
  const header = showBackButton ? (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          iconSide="left"
          onClick={() => previousPreviewPanel()}
          data-test-subj={PREVIEW_SECTION_BACK_BUTTON}
          aria-label={BACK_BUTTON}
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
          background-color: ${euiTheme.colors.shadow};
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
            margin: ${euiTheme.size.xs};
            height: 100%;
          `}
          data-test-subj={PREVIEW_SECTION}
        >
          {header}
          {component}
        </EuiPanel>
      </div>
    </>
  );
};

PreviewSection.displayName = 'PreviewSection';
