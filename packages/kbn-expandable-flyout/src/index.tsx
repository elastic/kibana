/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Interpolation, Theme } from '@emotion/react';
import { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlyoutResizableProps } from '@elastic/eui/src/components/flyout/flyout_resizable';
import { useInitializeFromLocalStorage } from './hooks/use_initialize_from_local_storage';
import { Content } from './components/content';
import { useWindowWidth } from './hooks/use_window_width';
import type { Panel } from './types';

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
export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({ ...props }) => {
  console.log('render - ExpandableFlyout');

  const windowWidth = useWindowWidth();

  useInitializeFromLocalStorage();

  const content = useMemo(() => <Content {...props} />, [props]);

  if (windowWidth === 0) {
    return null;
  }

  return <>{content}</>;
};

ExpandableFlyout.displayName = 'ExpandableFlyout';
