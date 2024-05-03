/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { Interpolation, Theme } from '@emotion/react';
import { EuiFlyoutProps, EuiFlyoutResizable } from '@elastic/eui';
import { EuiFlyoutResizableProps } from '@elastic/eui/src/components/flyout/flyout_resizable';
import { useInternalPercentages } from './hooks/use_internal_percentages';
import { RightSection } from './components/right_section';
import { useSections } from './hooks/use_sections';
import { useFlyoutWidth } from './hooks/use_flyout_width';
import { useDefaultSectionSizes } from './hooks/use_default_sections_sizes';
import { useResizedWidth } from './hooks/use_resized_width';
import { useFlyoutType } from './hooks/use_flyout_type';
import { SettingsMenu } from './components/settings_menu';
import { useWindowWidth } from './hooks/use_window_width';
import { useExpandableFlyoutState } from './hooks/use_expandable_flyout_state';
import { useExpandableFlyoutApi } from './hooks/use_expandable_flyout_api';
import type { FlyoutPanelProps, Panel } from './types';
import { PreviewSection } from './components/preview_section';
import { ResizableContainer } from './components/resizable_container';

const COLLAPSED_FLYOUT_MIN_WIDTH = 380;
const EXPANDED_FLYOUT_MIN_WIDTH = 740;

export interface ExpandableFlyoutProps extends Omit<EuiFlyoutResizableProps, 'onClose'> {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Allows for custom styles to be passed to the EuiFlyout component
   */
  customStyles?: Interpolation<Theme>;
  /**
   * Callback function to let application's code the flyout is closed
   */
  onClose?: EuiFlyoutProps['onClose'];
  /**
   * Set of properties that drive a settings menu
   */
  flyoutCustomProps?: {
    /**
     * Hide the gear icon and settings menu if true
     */
    hideSettings?: boolean;
    /**
     * Control if the option to render in overlay or push mode is enabled or not
     */
    pushVsOverlay?: {
      /**
       * Disables the option
       */
      disabled: boolean;
      /**
       * Tooltip to display
       */
      tooltip: string;
    };
    /**
     * Control if the option to resize the flyout is enabled or not
     */
    resize?: {
      /**
       * Disables the option
       */
      disabled: boolean;
      /**
       * Tooltip to display
       */
      tooltip: string;
    };
  };
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
  flyoutCustomProps,
  ...flyoutProps
}) => {
  // retrieves the window width
  const windowWidth = useWindowWidth();

  // calculates the left and right default section widths from the current window width
  const { defaultRightSectionWidth, defaultLeftSectionWidth } = useDefaultSectionSizes({
    windowWidth,
  });

  // allows to get, set, and reset the internal left and right percentages set by user when flyout is in expanded mode
  const { resetPercentages: resetInternalResizedPercentages } = useInternalPercentages({
    defaultRightSectionWidth,
    defaultLeftSectionWidth,
  });

  // allows to get, set, and reset the collapsed width set by user
  const {
    width: collapsedResizedWidth,
    setWidth: setCollapsedResizedWidth,
    resetWidth: resetCollapsedWidth,
  } = useResizedWidth({
    mode: 'collapsed',
  });
  // allows to get, set, and reset the expanded width set by user
  const {
    width: expandedResizedWidth,
    setWidth: setExpandedResizedWidth,
    resetWidth: resetExpandedWidth,
  } = useResizedWidth({ mode: 'expanded' });

  // push vs overlay mode
  const { flyoutType, flyoutTypeChange } = useFlyoutType();

  const { left, right, preview } = useExpandableFlyoutState();
  const { closeFlyout } = useExpandableFlyoutApi();

  // retrieves the sections to be displayed
  const { leftSection, rightSection, previewSection, mostRecentPreview, previewBanner } =
    useSections({
      registeredPanels,
    });

  // calculates what needs to be rendered
  const showLeft = leftSection != null && left != null;
  const showRight = rightSection != null && right != null;
  const showPreview = previewSection != null && preview != null;

  // calculates the flyout width
  const flyoutWidth = useFlyoutWidth({
    windowWidth,
    showRight,
    showLeft,
    defaultRightSectionWidth,
    defaultLeftSectionWidth,
    collapsedResizedWidth,
    expandedResizedWidth,
  });

  // we want to set a minimum flyout width different when in collapsed and expanded mode
  const minFlyoutWidth = useMemo(
    () => (showLeft ? EXPANDED_FLYOUT_MIN_WIDTH : COLLAPSED_FLYOUT_MIN_WIDTH),
    [showLeft]
  );

  // callback function called when user changes the flyout's width
  const onResize = useCallback(
    (width: number) => {
      if (showLeft) {
        setExpandedResizedWidth(width);
      } else if (showRight) {
        setCollapsedResizedWidth(width);
      }
    },
    [setCollapsedResizedWidth, setExpandedResizedWidth, showLeft, showRight]
  );

  // don't need to render if the windowWidth is 0 or if nothing needs to be rendered
  if (windowWidth === 0 || (!showLeft && !showRight && !showPreview)) {
    return null;
  }

  return (
    // @ts-ignore // TODO figure out why it's throwing an ref error
    <EuiFlyoutResizable
      {...flyoutProps}
      data-panel-id={right?.id ?? ''}
      type={flyoutType}
      size={flyoutWidth}
      ownFocus={false}
      onClose={(e) => {
        closeFlyout();
        if (flyoutProps.onClose) {
          flyoutProps.onClose(e);
        }
      }}
      css={customStyles}
      onResize={onResize}
      minWidth={minFlyoutWidth}
    >
      {showRight && !showLeft && (
        <RightSection component={rightSection.component({ ...(right as FlyoutPanelProps) })} />
      )}

      {showRight && showLeft && (
        <ResizableContainer
          registeredPanels={registeredPanels}
          defaultRightSectionWidth={defaultRightSectionWidth}
          defaultLeftSectionWidth={defaultLeftSectionWidth}
          showPreview={showPreview}
        />
      )}

      {showPreview && (
        <PreviewSection
          component={previewSection.component({ ...(mostRecentPreview as FlyoutPanelProps) })}
          banner={previewBanner}
          defaultRightSectionWidth={defaultRightSectionWidth}
          defaultLeftSectionWidth={defaultLeftSectionWidth}
          showLeft={showLeft}
        />
      )}

      {!flyoutCustomProps?.hideSettings && (
        <SettingsMenu
          flyoutTypeProps={{
            type: flyoutType,
            onChange: flyoutTypeChange,
            disabled: flyoutCustomProps?.pushVsOverlay?.disabled || false,
            tooltip: flyoutCustomProps?.pushVsOverlay?.tooltip || '',
          }}
          flyoutResizeProps={{
            onReset: () => {
              resetCollapsedWidth();
              resetExpandedWidth();
              resetInternalResizedPercentages();
            },
            disabled: flyoutCustomProps?.resize?.disabled || false,
            tooltip: flyoutCustomProps?.resize?.tooltip || '',
          }}
        />
      )}
    </EuiFlyoutResizable>
  );
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
