/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

const RIGHT_SECTION_MIN_WIDTH = 380;
const MIN_RESOLUTION_BREAKPOINT = 992;
const RIGHT_SECTION_MAX_WIDTH = 750;
const MAX_RESOLUTION_BREAKPOINT = 1920;

const LEFT_SECTION_MAX_WIDTH = 1500;

const FULL_WIDTH_BREAKPOINT = 1600;
const FULL_WIDTH_PADDING = 48;

export interface UseDefaultSectionsSizesParams {
  /**
   * The width of the browser window
   */
  windowWidth: number;
}

export interface UseDefaultSectionsSizesResult {
  /**
   * Width of the right section in pixels
   */
  defaultRightSectionWidth: number;
  /**
   * Width of the left section in pixels
   */
  defaultLeftSectionWidth: number;
  /**
   * Left position of the preview section in pixels
   */
  defaultPreviewSectionWidth: number;
}

/**
 * Hook that calculate the different width for the sections of the flyout and the flyout itself
 */
export const useDefaultSectionSizes = ({
  windowWidth,
}: UseDefaultSectionsSizesParams): UseDefaultSectionsSizesResult => {
  const rightSectionWidth: number = useMemo(() => {
    if (windowWidth === 0) {
      return 0;
    } else if (windowWidth < MIN_RESOLUTION_BREAKPOINT) {
      // the right section's width will grow from 380px (at 992px resolution) while handling tiny screens by not going smaller than the window width
      return Math.min(RIGHT_SECTION_MIN_WIDTH, windowWidth);
    } else {
      const ratioWidth =
        (RIGHT_SECTION_MAX_WIDTH - RIGHT_SECTION_MIN_WIDTH) *
        ((windowWidth - MIN_RESOLUTION_BREAKPOINT) /
          (MAX_RESOLUTION_BREAKPOINT - MIN_RESOLUTION_BREAKPOINT));

      // the right section's width will grow to 750px (at 1920px resolution) and will never go bigger than 750px in higher resolutions
      return Math.min(RIGHT_SECTION_MIN_WIDTH + ratioWidth, RIGHT_SECTION_MAX_WIDTH);
    }
  }, [windowWidth]);

  const leftSectionWidth: number = useMemo(() => {
    if (windowWidth === 0) {
      return 0;
    }
    // the left section's width will be nearly the remaining space for resolution lower than 1600px
    else if (windowWidth <= FULL_WIDTH_BREAKPOINT) {
      return windowWidth - rightSectionWidth - FULL_WIDTH_PADDING;
    } else {
      // the left section's width will be taking 80% of the remaining space for resolution higher than 1600px, while never going bigger than 1500px
      return Math.min(((windowWidth - rightSectionWidth) * 80) / 100, LEFT_SECTION_MAX_WIDTH);
    }
  }, [rightSectionWidth, windowWidth]);

  // preview section's width should only be similar to the right section.
  // Though because the preview is rendered with an absolute position in the flyout, we calculate its left position instead of the width
  // the preview section starts where the left section ends
  const previewSectionWidth: number = useMemo(() => {
    if (windowWidth === 0) {
      return 0;
    } else {
      return rightSectionWidth;
    }
  }, [rightSectionWidth, windowWidth]);

  return useMemo(
    () => ({
      defaultRightSectionWidth: rightSectionWidth,
      defaultLeftSectionWidth: leftSectionWidth,
      defaultPreviewSectionWidth: previewSectionWidth,
    }),
    [leftSectionWidth, previewSectionWidth, rightSectionWidth]
  );
};
