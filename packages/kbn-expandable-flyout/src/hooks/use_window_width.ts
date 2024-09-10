/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useState } from 'react';
import { useDispatch } from '../store/redux';
import { setDefaultWidthsAction } from '../store/default_widths_actions';

const RIGHT_SECTION_MIN_WIDTH = 380;
const MIN_RESOLUTION_BREAKPOINT = 992;
const RIGHT_SECTION_MAX_WIDTH = 750;
const MAX_RESOLUTION_BREAKPOINT = 1920;

const LEFT_SECTION_MAX_WIDTH = 1500;

const FULL_WIDTH_BREAKPOINT = 1600;
const FULL_WIDTH_PADDING = 48;

/**
 * Hook that returns the browser window width
 */
export const useWindowWidth = (): number => {
  console.log('useFlyoutWidth');
  const dispatch = useDispatch();

  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateSize() {
      setWidth(window.innerWidth);

      const windowWidth = window.innerWidth;
      if (windowWidth !== 0) {
        let rightSectionWidth: number;
        if (windowWidth < MIN_RESOLUTION_BREAKPOINT) {
          // the right section's width will grow from 380px (at 992px resolution) while handling tiny screens by not going smaller than the window width
          rightSectionWidth = Math.min(RIGHT_SECTION_MIN_WIDTH, windowWidth);
        } else {
          const ratioWidth =
            (RIGHT_SECTION_MAX_WIDTH - RIGHT_SECTION_MIN_WIDTH) *
            ((windowWidth - MIN_RESOLUTION_BREAKPOINT) /
              (MAX_RESOLUTION_BREAKPOINT - MIN_RESOLUTION_BREAKPOINT));

          // the right section's width will grow to 750px (at 1920px resolution) and will never go bigger than 750px in higher resolutions
          rightSectionWidth = Math.min(
            RIGHT_SECTION_MIN_WIDTH + ratioWidth,
            RIGHT_SECTION_MAX_WIDTH
          );
        }

        let leftSectionWidth: number;
        // the left section's width will be nearly the remaining space for resolution lower than 1600px
        if (windowWidth <= FULL_WIDTH_BREAKPOINT) {
          leftSectionWidth = windowWidth - rightSectionWidth - FULL_WIDTH_PADDING;
        } else {
          // the left section's width will be taking 80% of the remaining space for resolution higher than 1600px, while never going bigger than 1500px
          leftSectionWidth = Math.min(
            ((windowWidth - rightSectionWidth) * 80) / 100,
            LEFT_SECTION_MAX_WIDTH
          );
        }

        const previewSectionWidth: number = rightSectionWidth;

        dispatch(
          setDefaultWidthsAction({
            right: rightSectionWidth,
            left: leftSectionWidth,
            preview: previewSectionWidth,
          })
        );
      }
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [dispatch]);

  return width;
};
