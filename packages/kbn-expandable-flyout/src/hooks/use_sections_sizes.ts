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
  let rightSectionWidth: number = 0;
  let leftSectionWidth: number = 0;
  let previewSectionLeft: number = 0;

  if (showRight && !showLeft) {
    rightSectionWidth = 100;
  }

  if (showRight && showLeft) {
    rightSectionWidth = 20;
    leftSectionWidth = 80;
  }

  // preview section's width should only be similar to the right section.
  // Though because the preview is rendered with an absolute position in the flyout, we calculate its left position instead of the width
  if (showPreview) {
    // the preview section starts where the left section ends
    previewSectionLeft = leftSectionWidth;
  }

  return {
    rightSectionWidth,
    leftSectionWidth,
    previewSectionLeft,
  };
};
