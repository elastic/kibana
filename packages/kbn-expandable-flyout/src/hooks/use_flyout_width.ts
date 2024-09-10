/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectDefaultWidths, selectWidthsById, useSelector } from '../store/redux';

export interface UseFlyoutWidthParams {
  /**
   *
   */
  urlKey: string;
  /**
   *
   */
  showCollapsed: boolean;
  /**
   *
   */
  showExpanded: boolean;
}

/**
 * Calculates the width of the flyout based on the window width, the calculated default width, the user resized widths and which sections are visible or hidden.
 * The value returned is a percentage, usable directly in the EuiFlyoutResizable component.
 */
export const useFlyoutWidth = ({
  urlKey,
  showCollapsed,
  showExpanded,
}: UseFlyoutWidthParams): string => {
  console.log('render useFlyoutWidth');
  const { collapsedWidth: collapsedResizedWidth, expandedWidth: expandedResizedWidth } =
    useSelector(selectWidthsById(urlKey));
  const { leftWidth: defaultLeftSectionWidth, rightWidth: defaultRightSectionWidth } =
    useSelector(selectDefaultWidths);

  let flyoutWidth: number = 0;

  if (showCollapsed) {
    flyoutWidth = collapsedResizedWidth || defaultRightSectionWidth;
  }

  if (showExpanded) {
    flyoutWidth = expandedResizedWidth || defaultRightSectionWidth + defaultLeftSectionWidth;
  }

  return `${flyoutWidth}px`;
};
