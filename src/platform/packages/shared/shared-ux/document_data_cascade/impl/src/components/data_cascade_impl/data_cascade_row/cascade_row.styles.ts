/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import type { CascadeSizing } from '../types';

export const rootRowAttribute = 'root' as const;
export const childRowAttribute = 'sub-group' as const;

export const styles = (
  euiTheme: UseEuiTheme['euiTheme'],
  isExpandedChildRow: boolean,
  rowDepth: number,
  size: CascadeSizing
) => {
  const { border, size: euiSizing, colors } = euiTheme;

  // we use the native system selected item color, see https://developer.mozilla.org/en-US/docs/Web/CSS/system-color
  // for our pseudo focus outline color
  const OUTLINE_COLOR = 'LinkText';

  /**
   * Styles applied to the inner wrapper of an expanded child row
   * that contains all of the child row content
   */
  const expandedRowInnerBaseStyles = css({
    padding: euiSizing[size],

    '&:before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderTop: `${border.width.thin} solid ${border.color}`,
      borderLeft: `${border.width.thin} solid ${border.color}`,
      borderRight: `${border.width.thin} solid ${border.color}`,
    },

    [`[data-row-type="${rootRowAttribute}"] + [data-row-type="${childRowAttribute}"] &:before`]: {
      borderTopLeftRadius: border.radius.small,
      borderTopRightRadius: border.radius.small,
    },

    [`[data-row-type="${childRowAttribute}"]:has(+ [data-row-type="${rootRowAttribute}"]) &`]: {
      marginBottom: euiSizing[size],
    },

    [`[data-row-type="${childRowAttribute}"]:has(+ [data-row-type="${rootRowAttribute}"]) &:before`]:
      {
        borderBottomLeftRadius: border.radius.small,
        borderBottomRightRadius: border.radius.small,
        borderBottom: `${border.width.thin} solid ${border.color}`,
      },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"] &`]: {
      gap: 0,
    },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"] & > *`]: {
      padding: euiSizing[size],
      backgroundColor: colors.backgroundBasePlain,
    },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"] &:before`]: {
      backgroundColor: colors.backgroundBaseSubdued,
      zIndex: -1,
      borderTop: 0,
    },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"] &:after`]: {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      left: euiSizing[size],
      width: `calc(100% - ${euiSizing[size]} * 2)`,
      height: '100%',
      pointerEvents: 'none',
      borderTop: `${border.width.thin} solid ${border.color}`,
      borderLeft: `${border.width.thin} solid ${border.color}`,
      borderRight: `${border.width.thin} solid ${border.color}`,
    },

    [`[data-row-type="${childRowAttribute}"]:not([aria-level="3"]) + [data-row-type="${childRowAttribute}"][aria-level="3"]  &:after`]:
      {
        borderTopLeftRadius: border.radius.small,
        borderTopRightRadius: border.radius.small,
      },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"]:has(+ [data-row-type="${rootRowAttribute}"]:not([aria-level="3"]), + [data-row-type="${childRowAttribute}"]:not([aria-level="3"])) & > *:last-child`]:
      {
        marginBottom: euiSizing[size],
      },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"]:has(+ [data-row-type="${rootRowAttribute}"]:not([aria-level="3"]), + [data-row-type="${childRowAttribute}"]:not([aria-level="3"])) &:after`]:
      {
        height: `calc(100% - ${euiSizing[size]})`,
        borderBottomLeftRadius: border.radius.small,
        borderBottomRightRadius: border.radius.small,
        borderBottom: `${border.width.thin} solid ${border.color}`,
      },
  });

  const expandedRowInnerFocusStyles = css({
    [`[data-row-type="${childRowAttribute}"][aria-level="2"]:focus-visible &:before`]: {
      borderWidth: border.width.thick,
      borderColor: OUTLINE_COLOR,
    },

    // when a level 2 row is focused and followed by a level 2 row, this implies the focused row is not expanded
    [`[data-row-type="${childRowAttribute}"][aria-level="2"]:focus-visible:has(+ [aria-level="2"]) &:before`]:
      {
        borderBottom: `${border.width.thick} solid ${OUTLINE_COLOR}`,
        borderRadius: border.radius.small,
      },

    // when a level 2 row is focused and followed by a level 3 row, this implies the focused row is expanded
    [`[data-row-type="${childRowAttribute}"][aria-level="2"]:focus-visible:has(+ [aria-level="3"]) &:before`]:
      {
        borderTopLeftRadius: border.radius.small,
        borderTopRightRadius: border.radius.small,
      },

    // when a level 2 row is focused and followed by a level 3 row, which implies the focused row is expanded we select all it's children
    [`[data-row-type="${childRowAttribute}"][aria-level="2"]:focus-visible:has(+ [aria-level="3"]) ~ [aria-level="3"] &:before`]:
      {
        borderWidth: border.width.thick,
        borderColor: OUTLINE_COLOR,
      },

    // when a level 2 row is focused and followed by a level 3 row, which implies the focused row is expanded we select it's last child here
    [`[data-row-type="${childRowAttribute}"][aria-level="2"]:focus-visible:has(+ [aria-level="3"]) ~ [aria-level="3"]:has(+ [aria-level="2"]) &:before`]:
      {
        borderBottom: `${border.width.thick} solid ${OUTLINE_COLOR}`,
        borderBottomLeftRadius: border.radius.small,
        borderBottomRightRadius: border.radius.small,
      },

    [`[data-row-type="${childRowAttribute}"][aria-level="3"]:focus-visible &:after`]: {
      borderWidth: border.width.thick,
      borderColor: OUTLINE_COLOR,
      borderRadius: border.radius.small,
    },

    // when a level 3 row is focused and preceded by any row, we want to apply a border to the bottom of the row
    [`[data-row-type="${childRowAttribute}"][aria-level="3"]:focus-visible:has(+ [aria-level]) &:after`]:
      {
        borderBottom: `${border.width.thick} solid ${OUTLINE_COLOR}`,
        borderRadius: border.radius.small,
      },
  });

  return {
    rowStickyHeaderInner: css({
      padding: euiSizing[size],
      position: 'absolute',
      width: '100%',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderWidth: `0 ${border.width.thin} ${border.width.thin} 0`,
      borderStyle: 'solid',
      borderColor: border.color,
    }),
    rowWrapper: css({
      display: 'flex',
      position: 'absolute',
      width: '100%',
      padding: euiSizing[size],
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      outlineColor: OUTLINE_COLOR,

      '&:before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        borderRight: `${border.width.thin} solid ${border.color}`,
      },

      [`&[data-row-type="${rootRowAttribute}"]:focus-visible:before`]: {
        borderTop: `${border.width.thin} solid ${border.color}`,
      },

      [`&[data-row-type="${rootRowAttribute}"]:not(:first-of-type):before`]: {
        borderTop: `${border.width.thin} solid ${border.color}`,
      },

      [`&[data-row-type="${rootRowAttribute}"]:last-of-type:before`]: {
        borderBottom: `${border.width.thin} solid ${border.color}`,
      },

      [`&[data-row-type="${childRowAttribute}"]`]: {
        paddingTop: 0,
        paddingBottom: 0,
      },

      // Focus visible styles for the root row when it has a child row, we remove the default focus outline so we can apply our own
      [`&[data-row-type="${rootRowAttribute}"]:focus-visible:has(+ [data-row-type="${childRowAttribute}"])`]:
        {
          outline: 'none',

          '&:before': {
            borderLeftWidth: border.width.thick,
            borderLeftStyle: 'solid',
            borderWidth: border.width.thick,
            borderColor: OUTLINE_COLOR,
            borderTopLeftRadius: border.radius.small,
            borderTopRightRadius: border.radius.small,
          },

          [`& ~ [data-row-type="${childRowAttribute}"]:before`]: {
            borderLeftWidth: border.width.thick,
            borderLeftStyle: 'solid',
            borderColor: OUTLINE_COLOR,
            borderWidth: border.width.thick,
          },

          // targets the last child of an expanded level 1 row
          [`& ~ [data-row-type="${childRowAttribute}"]:has(+ [data-row-type="${rootRowAttribute}"]):before`]:
            {
              borderBottom: `${border.width.thick} solid ${OUTLINE_COLOR}`,
              borderBottomLeftRadius: border.radius.small,
              borderBottomRightRadius: border.radius.small,
            },
        },

      // remove the default focus outline so we can apply our own row inner specific styles
      [`&[data-row-type="${childRowAttribute}"]:focus-visible`]: {
        outline: 'none',
      },
    }),
    rowInner: css([
      {
        width: '100%',
        position: 'relative',
      },
      isExpandedChildRow ? [expandedRowInnerBaseStyles, expandedRowInnerFocusStyles] : {},
      rowDepth % 2 === 1
        ? {
            backgroundColor: colors.backgroundBaseSubdued,
          }
        : {
            paddingTop: 0,
            paddingBottom: 0,
          },
    ]),
  };
};
