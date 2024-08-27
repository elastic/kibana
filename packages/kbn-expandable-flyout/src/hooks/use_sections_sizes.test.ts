/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, RenderHookResult } from '@testing-library/react';
import type { UserSectionsSizesParams, UserSectionsSizesResult } from './use_sections_sizes';
import { useSectionSizes } from './use_sections_sizes';

describe('useSectionSizes', () => {
  let hookResult: RenderHookResult<UserSectionsSizesResult, UserSectionsSizesParams>;

  describe('Right section', () => {
    it('should return 0 for right section if it is hidden', () => {
      const initialProps = {
        windowWidth: 350,
        showRight: false,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 0,
        leftSectionWidth: 0,
        flyoutWidth: '0px',
        previewSectionLeft: 0,
      });
    });

    it('should return the window width for right section size for tiny screen', () => {
      const initialProps = {
        windowWidth: 350,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 350,
        leftSectionWidth: 0,
        flyoutWidth: '350px',
        previewSectionLeft: 0,
      });
    });

    it('should return 380 for right section size for medium screen', () => {
      const initialProps = {
        windowWidth: 600,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 0,
        flyoutWidth: '380px',
        previewSectionLeft: 0,
      });
    });

    it('should return 500 for right section size for large screen', () => {
      const initialProps = {
        windowWidth: 1300,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current.rightSectionWidth).toBeGreaterThan(420);
      expect(hookResult.result.current.rightSectionWidth).toBeLessThan(750);
      expect(hookResult.result.current.leftSectionWidth).toEqual(0);
      expect(hookResult.result.current.flyoutWidth).toEqual(
        `${hookResult.result.current.rightSectionWidth}px`
      );
      expect(hookResult.result.current.previewSectionLeft).toEqual(0);
    });

    it('should return 750 for right section size for very large screen', () => {
      const initialProps = {
        windowWidth: 2500,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 750,
        leftSectionWidth: 0,
        flyoutWidth: '750px',
        previewSectionLeft: 0,
      });
    });
  });

  describe('Left section', () => {
    it('should return 0 for left section if it is hidden', () => {
      const initialProps = {
        windowWidth: 500,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 0,
        flyoutWidth: '380px',
        previewSectionLeft: 0,
      });
    });

    it('should return the remaining for left section', () => {
      const initialProps = {
        windowWidth: 500,
        showRight: true,
        showLeft: true,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 72,
        flyoutWidth: '452px',
        previewSectionLeft: 0,
      });
    });

    it('should return 80% of remaining for left section', () => {
      const initialProps = {
        windowWidth: 2500,
        showRight: true,
        showLeft: true,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current.rightSectionWidth).toEqual(750);
      expect(hookResult.result.current.leftSectionWidth).toEqual((2500 - 750) * 0.8);
      expect(hookResult.result.current.flyoutWidth).toEqual(
        `${
          hookResult.result.current.rightSectionWidth + hookResult.result.current.leftSectionWidth
        }px`
      );
      expect(hookResult.result.current.previewSectionLeft).toEqual(0);
    });

    it('should return max out at 1500px for really big screens', () => {
      const initialProps = {
        windowWidth: 2700,
        showRight: true,
        showLeft: true,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current.rightSectionWidth).toEqual(750);
      expect(hookResult.result.current.leftSectionWidth).toEqual(1500);
      expect(hookResult.result.current.flyoutWidth).toEqual(
        `${
          hookResult.result.current.rightSectionWidth + hookResult.result.current.leftSectionWidth
        }px`
      );
      expect(hookResult.result.current.previewSectionLeft).toEqual(0);
    });
  });

  describe('Preview section', () => {
    it('should return the 0 for preview section if it is hidden', () => {
      const initialProps = {
        windowWidth: 600,
        showRight: true,
        showLeft: false,
        showPreview: false,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 0,
        flyoutWidth: '380px',
        previewSectionLeft: 0,
      });
    });

    it('should return the 0 for preview section when left section is hidden', () => {
      const initialProps = {
        windowWidth: 600,
        showRight: true,
        showLeft: false,
        showPreview: true,
      };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 0,
        flyoutWidth: '380px',
        previewSectionLeft: 0,
      });
    });

    it('should return for preview section when left section is visible', () => {
      const initialProps = { windowWidth: 600, showRight: true, showLeft: true, showPreview: true };
      hookResult = renderHook((props: UserSectionsSizesParams) => useSectionSizes(props), {
        initialProps,
      });

      expect(hookResult.result.current).toEqual({
        rightSectionWidth: 380,
        leftSectionWidth: 172,
        flyoutWidth: '552px',
        previewSectionLeft: 172,
      });
    });
  });
});
