/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const RIGHT_SECTION_MIN_WIDTH = 380;
const MIN_RESOLUTION_BREAKPOINT = 992;
const RIGHT_SECTION_MAX_WIDTH = 750;
const MAX_RESOLUTION_BREAKPOINT = 1920;

const LEFT_SECTION_MAX_WIDTH = 1500;

const FULL_WIDTH_BREAKPOINT = 1600;
const FULL_WIDTH_PADDING = 48;

export interface UserSectionsSizesParams {
  /**
   * The width of the browser window
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
   * True if the preview section is visible, false otherwise
   */
  showPreview: boolean;
}

export interface UserSectionsSizesResult {
  /**
   * Width of the right section in pixels
   */
  rightSectionWidth: number;
  /**
   * Width of the left section in pixels
   */
  leftSectionWidth: number;
  /**
   * Width of the flyout in pixels
   */
  flyoutWidth: string;
  /**
   * Left position of the preview section in pixels
   */
  previewSectionLeft: number;
}

/**
 * Hook that calculate the different width for the sections of the flyout and the flyout itself
 */
export const useSectionSizes = ({
  windowWidth,
  showRight,
  showLeft,
  showPreview,
}: UserSectionsSizesParams): UserSectionsSizesResult => {
  // the right section's width will grow from 380px (at 992px resolution) to 750px (at 1920px resolution)
  let rightSectionWidth: number = showRight
    ? windowWidth < MIN_RESOLUTION_BREAKPOINT
      ? RIGHT_SECTION_MIN_WIDTH
      : RIGHT_SECTION_MIN_WIDTH +
        (RIGHT_SECTION_MAX_WIDTH - RIGHT_SECTION_MIN_WIDTH) *
          ((windowWidth - MIN_RESOLUTION_BREAKPOINT) /
            (MAX_RESOLUTION_BREAKPOINT - MIN_RESOLUTION_BREAKPOINT))
    : 0;

  // handle tiny screens by not going smaller than the window width
  if (rightSectionWidth > windowWidth) rightSectionWidth = windowWidth;

  // never go bigger than 750px
  if (rightSectionWidth > RIGHT_SECTION_MAX_WIDTH) rightSectionWidth = RIGHT_SECTION_MAX_WIDTH;

  // the left section's width will be nearly the remaining space for resolution lower than 1600px, and 80% of the remaining space for resolution higher than 1600px
  let leftSectionWidth: number = showLeft
    ? windowWidth <= FULL_WIDTH_BREAKPOINT
      ? windowWidth - rightSectionWidth - FULL_WIDTH_PADDING
      : ((windowWidth - rightSectionWidth) * 80) / 100
    : 0;

  // never go bigger than 1500px
  if (leftSectionWidth > LEFT_SECTION_MAX_WIDTH) leftSectionWidth = LEFT_SECTION_MAX_WIDTH;

  const flyoutWidth: string =
    showRight && showLeft ? `${rightSectionWidth + leftSectionWidth}px` : `${rightSectionWidth}px`;

  // preview section's width should only be similar to the right section
  const previewSectionLeft: number =
    showPreview && showLeft
      ? windowWidth <= MAX_RESOLUTION_BREAKPOINT
        ? windowWidth - rightSectionWidth - FULL_WIDTH_PADDING
        : ((windowWidth - rightSectionWidth) * 80) / 100
      : 0;

  return {
    rightSectionWidth,
    leftSectionWidth,
    flyoutWidth,
    previewSectionLeft,
  };
};
