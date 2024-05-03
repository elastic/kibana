/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface UseFlyoutWidthParams {
  /**
   *
   */
  windowWidth: number;
  /**
   * True if the right section is visible, false otherwise
   */
  showRight: boolean;
  /**
   * True if the left section is visible, false otherwise
   */
  showLeft: boolean;
  /**
   * Default width of the right section calculated from the windowWidth
   */
  defaultRightSectionWidth: number;
  /**
   * Default width of the left section calculated from the windowWidth
   */
  defaultLeftSectionWidth: number;
  /**
   * Width of the collapsed flyout when resized by the user
   */
  collapsedResizedWidth: number | undefined;
  /**
   * Width of the expanded flyout when resized by the user
   */
  expandedResizedWidth: number | undefined;
}

/**
 * Calculates the width of the flyout based on the window width, the calculated default width, the user resized widths and which sections are visible or hidden.
 * The value returned is a percentage, usable directly in the EuiFlyoutResizable component.
 */
export const useFlyoutWidth = ({
  windowWidth,
  showRight,
  showLeft,
  defaultRightSectionWidth,
  defaultLeftSectionWidth,
  collapsedResizedWidth,
  expandedResizedWidth,
}: UseFlyoutWidthParams): string => {
  let flyoutWidth: number = 0;

  if (showRight && !showLeft) {
    flyoutWidth = collapsedResizedWidth || defaultRightSectionWidth;
  }

  if (showRight && showLeft) {
    flyoutWidth = expandedResizedWidth || defaultRightSectionWidth + defaultLeftSectionWidth;
  }

  return `${(flyoutWidth / windowWidth) * 100}%`;
};
