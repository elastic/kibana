/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlyout } from '@elastic/eui';
import { useExpandableFlyoutContext } from './context';
import { PreviewSection } from './components/preview_section';
import { RightSection } from './components/right_section';
import type { FlyoutPanelProps, Panel } from './types';
import { LeftSection } from './components/left_section';
import { isPreviewBanner } from './components/preview_section';

export interface ExpandableFlyoutProps extends Omit<EuiFlyoutProps, 'onClose'> {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Propagate out EuiFlyout onClose event
   */
  handleOnFlyoutClosed?: () => void;
}

const flyoutStyles = css`
  overflow-y: scroll;
`;

const flyoutInnerStyles = { height: '100%' };

/**
 * Expandable flyout UI React component.
 * Displays 3 sections (right, left, preview) depending on the panels in the context.
 *
 * The behavior expects that the left and preview sections should only be displayed is a right section
 * is already rendered.
 */
export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({
  registeredPanels,
  handleOnFlyoutClosed,
  ...flyoutProps
}) => {
  const { panels, closeFlyout } = useExpandableFlyoutContext();
  const { left, right, preview } = panels;

  const onClose = useCallback(() => {
    if (handleOnFlyoutClosed) handleOnFlyoutClosed();
    closeFlyout();
  }, [closeFlyout, handleOnFlyoutClosed]);

  const leftSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === left?.id),
    [left, registeredPanels]
  );

  const rightSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === right?.id),
    [right, registeredPanels]
  );

  // retrieve the last preview panel (most recent)
  const mostRecentPreview = preview ? preview[preview.length - 1] : undefined;
  const previewBanner = isPreviewBanner(mostRecentPreview?.params?.banner)
    ? mostRecentPreview?.params?.banner
    : undefined;

  const showBackButton = preview && preview.length > 1;
  const previewSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === mostRecentPreview?.id),
    [mostRecentPreview, registeredPanels]
  );

  const hideFlyout = !left && !right && !preview.length;

  if (hideFlyout) {
    return null;
  }

  const flyoutWidth: string = leftSection && rightSection ? 'l' : 's';
  const rightSectionWidth: number = leftSection ? 0.4 : 1;
  const leftSectionWidth: number = 0.6;
  const previewSectionWidth: number = leftSection ? 0.4 : 1;

  return (
    <EuiFlyout
      css={flyoutStyles}
      {...flyoutProps}
      size={flyoutWidth}
      ownFocus={false}
      onClose={onClose}
    >
      <EuiFlexGroup
        direction={leftSection ? 'row' : 'column'}
        wrap={false}
        gutterSize="none"
        style={flyoutInnerStyles}
      >
        {leftSection && left ? (
          <LeftSection
            component={leftSection.component({ ...(left as FlyoutPanelProps) })}
            width={leftSectionWidth}
          />
        ) : null}
        {rightSection && right ? (
          <RightSection
            component={rightSection.component({ ...(right as FlyoutPanelProps) })}
            width={rightSectionWidth}
          />
        ) : null}
      </EuiFlexGroup>

      {previewSection && preview ? (
        <PreviewSection
          component={previewSection.component({ ...(mostRecentPreview as FlyoutPanelProps) })}
          showBackButton={showBackButton}
          width={previewSectionWidth}
          banner={previewBanner}
        />
      ) : null}
    </EuiFlyout>
  );
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
