/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectDefaultWidths, selectWidthsById, useSelector } from '../redux';

export interface UseFlyoutWidthParams {
  /**
   *
   */
  urlKey: string;
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
}

/**
 * Calculates the width of the flyout based on the window width, the calculated default width, the user resized widths and which sections are visible or hidden.
 * The value returned is a percentage, usable directly in the EuiFlyoutResizable component.
 */
export const useFlyoutWidth = ({
  urlKey,
  windowWidth,
  showRight,
  showLeft,
}: UseFlyoutWidthParams): string => {
  const { collapsedWidth: collapsedResizedWidth, expandedWidth: expandedResizedWidth } =
    useSelector(selectWidthsById(urlKey));
  const { leftWidth: defaultLeftSectionWidth, rightWidth: defaultRightSectionWidth } =
    useSelector(selectDefaultWidths);

  let flyoutWidth: number = 0;

  if (showRight && !showLeft) {
    flyoutWidth = collapsedResizedWidth || defaultRightSectionWidth;
  }

  if (showRight && showLeft) {
    flyoutWidth = expandedResizedWidth || defaultRightSectionWidth + defaultLeftSectionWidth;
  }

  return `${(flyoutWidth / windowWidth) * 100}%`;
};
