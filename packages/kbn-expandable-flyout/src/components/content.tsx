/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Interpolation, Theme } from '@emotion/react';
import { EuiFlyoutProps, EuiFlyoutResizable } from '@elastic/eui';
import { EuiFlyoutResizableProps } from '@elastic/eui/src/components/flyout/flyout_resizable';
import { useExpandableFlyoutContext } from '../context';
import { changeCollapsedWidthAction, changeExpandedWidthAction } from '../store/widths_actions';
import {
  selectPushVsOverlayById,
  selectWidthsById,
  useDispatch,
  useSelector,
} from '../store/redux';
import { RightSection } from './right_section';
import { useSections } from '../hooks/use_sections';
import { useExpandableFlyoutState } from '../hooks/use_expandable_flyout_state';
import { useExpandableFlyoutApi } from '../hooks/use_expandable_flyout_api';
import type { FlyoutPanelProps, Panel } from '../types';
import { SettingsMenu } from './settings_menu';
import { PreviewSection } from './preview_section';
import { ResizableContainer } from './resizable_container';

const COLLAPSED_FLYOUT_MIN_WIDTH = 380;
const EXPANDED_FLYOUT_MIN_WIDTH = 740;

export interface ContentProps extends Omit<EuiFlyoutResizableProps, 'onClose'> {
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
export const Content: React.FC<ContentProps> = memo(
  ({ customStyles, registeredPanels, flyoutCustomProps, ...flyoutProps }) => {
    console.log('Content');

    const dispatch = useDispatch();

    const { left, right, preview } = useExpandableFlyoutState();
    const { urlKey } = useExpandableFlyoutContext();
    const { closeFlyout } = useExpandableFlyoutApi();

    const flyoutType = useSelector(selectPushVsOverlayById(urlKey));
    const flyoutWidths = useSelector(selectWidthsById(urlKey));

    // retrieves the sections to be displayed
    const { leftSection, rightSection, previewSection, mostRecentPreview, previewBanner } =
      useSections({
        registeredPanels,
      });

    // calculates what needs to be rendered
    const showLeft = useMemo(() => leftSection != null && left != null, [leftSection, left]);
    const showRight = useMemo(() => rightSection != null && right != null, [rightSection, right]);
    const showPreview = useMemo(
      () => previewSection != null && preview != null,
      [previewSection, preview]
    );

    const showCollapsed = useMemo(() => !showLeft && showRight, [showLeft, showRight]);
    const showExpanded = useMemo(() => showLeft && showRight, [showLeft, showRight]);

    const rightComponent = useMemo(
      () => (rightSection ? rightSection.component({ ...(right as FlyoutPanelProps) }) : null),
      [rightSection, right]
    );
    const previewComponent = useMemo(
      () =>
        previewSection
          ? previewSection.component({
              ...(mostRecentPreview as FlyoutPanelProps),
            })
          : null,
      [previewSection, mostRecentPreview]
    );

    // we want to set a minimum flyout width different when in collapsed and expanded mode
    const minFlyoutWidth = useMemo(
      () => (showExpanded ? EXPANDED_FLYOUT_MIN_WIDTH : COLLAPSED_FLYOUT_MIN_WIDTH),
      [showExpanded]
    );

    const flyoutWidth = useMemo(() => {
      if (showCollapsed) {
        return flyoutWidths.collapsedWidth;
      }
      if (showExpanded) {
        return flyoutWidths.expandedWidth;
      }
    }, [showCollapsed, showExpanded, flyoutWidths]);

    // callback function called when user changes the flyout's width
    const onResize = useCallback(
      (width: number) => {
        if (showExpanded && urlKey) {
          dispatch(changeExpandedWidthAction({ width, id: urlKey, savedToLocalStorage: true }));
        } else if (showCollapsed && urlKey) {
          dispatch(changeCollapsedWidthAction({ width, id: urlKey, savedToLocalStorage: true }));
        }
      },
      [dispatch, showLeft, showRight, urlKey]
    );

    // don't need to render if the windowWidth is 0 or if nothing needs to be rendered
    if (!showLeft && !showRight && !showPreview) {
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
        {showCollapsed && <RightSection component={rightComponent} />}

        {showExpanded && (
          <ResizableContainer
            leftSection={leftSection}
            rightSection={rightSection}
            left={left}
            right={right}
            showPreview={showPreview}
          />
        )}

        {showPreview && (
          <PreviewSection
            component={previewComponent}
            banner={previewBanner}
            showExpanded={showExpanded}
          />
        )}

        {!flyoutCustomProps?.hideSettings && (
          <SettingsMenu urlKey={urlKey} flyoutCustomProps={flyoutCustomProps} />
        )}
      </EuiFlyoutResizable>
    );
  }
);

Content.displayName = 'Content';
