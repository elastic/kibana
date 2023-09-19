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
  EuiText,
  useEuiTheme,
  EuiSplitPanel,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { has } from 'lodash';
import {
  PREVIEW_SECTION_BACK_BUTTON,
  PREVIEW_SECTION_CLOSE_BUTTON,
  PREVIEW_SECTION_HEADER,
  PREVIEW_SECTION,
} from './test_ids';
import { useExpandableFlyoutContext } from '../..';
import { BACK_BUTTON, CLOSE_BUTTON } from './translations';

export interface PreviewBanner {
  /**
   * Optional title to be shown
   */
  title?: string;
  /**
   * Optional string for background color
   */
  backgroundColor?:
    | 'primary'
    | 'plain'
    | 'warning'
    | 'accent'
    | 'success'
    | 'danger'
    | 'transparent'
    | 'subdued';
  /**
   * Optional string for text color
   */
  textColor?: string;
}

/**
 * Type guard to check the passed object is of preview banner type
 * @param banner passed from panel params
 * @returns a boolean to indicate whether the banner passed is a preview banner
 */
export const isPreviewBanner = (banner: unknown): banner is PreviewBanner => {
  return has(banner, 'title') || has(banner, 'backgroundColor') || has(banner, 'textColor');
};

interface PreviewSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Width used when rendering the panel
   */
  width: number;
  /**
   * Display the back button in the header
   */
  showBackButton: boolean;
  /**
   * Preview banner shown at the top of preview panel
   */
  banner?: PreviewBanner;
}

/**
 * Preview section of the expanded flyout rendering one or multiple panels.
 * Will display a back and close button in the header for the previous and close feature respectively.
 */
export const PreviewSection: React.FC<PreviewSectionProps> = ({
  component,
  showBackButton,
  width,
  banner,
}: PreviewSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const { closePreviewPanel, previousPreviewPanel } = useExpandableFlyoutContext();
  const left = `${(1 - width) * 100}%`;

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
    <div
      css={css`
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: ${left};
        z-index: 1000;
      `}
    >
      <EuiSplitPanel.Outer
        css={css`
          margin: ${euiTheme.size.xs};
          height: 99%;
          box-shadow: 0px 0px 5px 5px ${euiTheme.colors.darkShade};
        `}
        className="eui-yScroll"
        data-test-subj={PREVIEW_SECTION}
      >
        {isPreviewBanner(banner) && (
          <EuiSplitPanel.Inner grow={false} color={banner.backgroundColor} paddingSize="none">
            <EuiText textAlign="center" color={banner.textColor} size="s">
              {banner.title}
            </EuiText>
          </EuiSplitPanel.Inner>
        )}
        <EuiSplitPanel.Inner grow={false} paddingSize="s" data-test-subj={PREVIEW_SECTION_HEADER}>
          {header}
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="none">{component}</EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </div>
  );
};

PreviewSection.displayName = 'PreviewSection';
