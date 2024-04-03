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
  PREVIEW_SECTION_BACK_BUTTON_TEST_ID,
  PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID,
  PREVIEW_SECTION_HEADER_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
} from './test_ids';
import { useExpandableFlyoutApi } from '../..';
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
   * Left position used when rendering the panel
   */
  leftPosition: number;
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
  leftPosition,
  banner,
}: PreviewSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const { closePreviewPanel, previousPreviewPanel } = useExpandableFlyoutApi();

  const left = leftPosition + 4;

  const closeButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="cross"
        onClick={() => closePreviewPanel()}
        data-test-subj={PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID}
        aria-label={CLOSE_BUTTON}
      />
    </EuiFlexItem>
  );
  const header = showBackButton ? (
    <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          iconSide="left"
          onClick={() => previousPreviewPanel()}
          data-test-subj={PREVIEW_SECTION_BACK_BUTTON_TEST_ID}
          aria-label={BACK_BUTTON}
        >
          {BACK_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {closeButton}
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
      {closeButton}
    </EuiFlexGroup>
  );

  return (
    <div
      css={css`
        position: absolute;
        top: 4px;
        bottom: 12px;
        right: 4px;
        left: ${left}px;
        z-index: 1000;
      `}
    >
      <EuiSplitPanel.Outer
        css={css`
          margin: ${euiTheme.size.xs};
          box-shadow: 0 0 4px 4px ${euiTheme.colors.darkShade};
        `}
        className="eui-yScroll"
        data-test-subj={PREVIEW_SECTION_TEST_ID}
      >
        {isPreviewBanner(banner) && (
          <EuiSplitPanel.Inner
            grow={false}
            color={banner.backgroundColor}
            paddingSize="none"
            data-test-subj={`${PREVIEW_SECTION_TEST_ID}BannerPanel`}
          >
            <EuiText
              textAlign="center"
              color={banner.textColor}
              size="s"
              data-test-subj={`${PREVIEW_SECTION_TEST_ID}BannerText`}
            >
              {banner.title}
            </EuiText>
          </EuiSplitPanel.Inner>
        )}
        <EuiSplitPanel.Inner
          grow={false}
          paddingSize="s"
          data-test-subj={PREVIEW_SECTION_HEADER_TEST_ID}
        >
          {header}
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="none">{component}</EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </div>
  );
};

PreviewSection.displayName = 'PreviewSection';
