/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { Interpolation, Theme } from '@emotion/react';
import { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlyout } from '@elastic/eui';
import { useSectionSizes } from './hooks/use_sections_sizes';
import { useWindowSize } from './hooks/use_window_size';
import { useExpandableFlyoutState } from './hooks/use_expandable_flyout_state';
import { useExpandableFlyoutApi } from './hooks/use_expandable_flyout_api';
import { PreviewSection } from './components/preview_section';
import { RightSection } from './components/right_section';
import type { FlyoutPanelProps, Panel } from './types';
import { LeftSection } from './components/left_section';
import { isPreviewBanner } from './components/preview_section';

const flyoutInnerStyles = { height: '100%' };

export interface ExpandableFlyoutProps extends Omit<EuiFlyoutProps, 'onClose'> {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Allows for custom styles to be passed to the EuiFlyout component
   */
  customStyles?: Interpolation<Theme>;
}

/**
 * Expandable flyout UI React component.
 * Displays 3 sections (right, left, preview) depending on the panels in the context.
 *
 * The behavior expects that the left and preview sections should only be displayed is a right section
 * is already rendered.
 */
export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({
  customStyles,
  registeredPanels,
  ...flyoutProps
}) => {
  const windowWidth = useWindowSize();

  const { left, right, preview } = useExpandableFlyoutState();
  const { closeFlyout } = useExpandableFlyoutApi();

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

  const showBackButton = !!preview && preview.length > 1;
  const previewSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === mostRecentPreview?.id),
    [mostRecentPreview, registeredPanels]
  );

  const showRight = rightSection != null && right != null;
  const showLeft = leftSection != null && left != null;
  const showPreview = previewSection != null && preview != null;

  const { rightSectionWidth, leftSectionWidth, flyoutWidth, previewSectionLeft } = useSectionSizes({
    windowWidth,
    showRight,
    showLeft,
    showPreview,
  });

  const hideFlyout = !left && !right && !preview?.length;
  if (hideFlyout) {
    return null;
  }

  return (
    <EuiFlyout
      {...flyoutProps}
      size={flyoutWidth}
      ownFocus={false}
      onClose={closeFlyout}
      css={customStyles}
    >
      <EuiFlexGroup
        direction={leftSection ? 'row' : 'column'}
        wrap={false}
        gutterSize="none"
        style={flyoutInnerStyles}
        responsive={false}
      >
        {showLeft ? (
          <LeftSection
            component={leftSection.component({ ...(left as FlyoutPanelProps) })}
            width={leftSectionWidth}
          />
        ) : null}
        {showRight ? (
          <RightSection
            component={rightSection.component({ ...(right as FlyoutPanelProps) })}
            width={rightSectionWidth}
          />
        ) : null}
      </EuiFlexGroup>

      {showPreview ? (
        <PreviewSection
          component={previewSection.component({ ...(mostRecentPreview as FlyoutPanelProps) })}
          showBackButton={showBackButton}
          leftPosition={previewSectionLeft}
          banner={previewBanner}
        />
      ) : null}
    </EuiFlyout>
  );
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
