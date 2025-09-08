/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { EuiThemeShape, UseEuiTheme } from '@elastic/eui';

export const rootRowAttribute = 'root' as const;
export const childRowAttribute = 'sub-group' as const;

export const styles = (
  euiTheme: UseEuiTheme['euiTheme'],
  isExpandedChildRow: boolean,
  rowDepth: number,
  size: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>
) => ({
  rowHeaderSlotWrapper: css({
    justifyContent: 'center',
    alignItems: 'center',
    borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    paddingLeft: euiTheme.size.s,
    flexGrow: 0,
  }),
  rowWrapper: css({
    display: 'flex',
    position: 'absolute',
    width: '100%',
    padding: euiTheme.size[size],
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    [`&[data-row-type="${childRowAttribute}"]`]: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    '&:before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
      borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    },
    [`&[data-row-type="${rootRowAttribute}"]:not([data-active-sticky]):before`]: {
      borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    },
    [`&[data-row-type="${rootRowAttribute}"]:first-of-type:not([data-active-sticky]):before`]: {
      borderTopLeftRadius: euiTheme.border.radius.small,
      borderTopRightRadius: euiTheme.border.radius.small,
    },
    [`&[data-row-type="${rootRowAttribute}"]:last-of-type:not([data-active-sticky]):before`]: {
      borderBottomLeftRadius: euiTheme.border.radius.small,
      borderBottomRightRadius: euiTheme.border.radius.small,
    },
    [`&[data-row-type="${rootRowAttribute}"]:last-of-type:before`]: {
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    },
  }),
  rowInner: css({
    width: '100%',
    position: 'relative',
    ...(isExpandedChildRow
      ? {
          padding: euiTheme.size[size],
          ...(rowDepth % 2 === 1
            ? {
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              }
            : {
                paddingTop: 0,
                paddingBottom: 0,
              }),

          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },

          [`[data-row-type="${rootRowAttribute}"] + [data-row-type="${childRowAttribute}"] &:before`]:
            {
              borderTopLeftRadius: euiTheme.border.radius.small,
              borderTopRightRadius: euiTheme.border.radius.small,
            },

          [`[data-row-type="${childRowAttribute}"]:has(+ [data-row-type="${rootRowAttribute}"]) &`]:
            {
              marginBottom: euiTheme.size[size],
            },

          [`[data-row-type="${childRowAttribute}"]:has(+ [data-row-type="${rootRowAttribute}"]) &:before`]:
            {
              borderBottomLeftRadius: euiTheme.border.radius.small,
              borderBottomRightRadius: euiTheme.border.radius.small,
              borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"] &`]: {
            gap: 0,
          },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"] & > *`]: {
            padding: euiTheme.size[size],
            backgroundColor: euiTheme.colors.backgroundBasePlain,
          },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"] &:before`]: {
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            zIndex: -1,
            borderTop: 0,
          },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"] &:after`]: {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: euiTheme.size[size],
            width: `calc(100% - ${euiTheme.size[size]} * 2)`,
            height: '100%',
            pointerEvents: 'none',
            borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },

          [`[data-row-type="${childRowAttribute}"]:not([aria-level="3"]) + [data-row-type="${childRowAttribute}"][aria-level="3"]  &:after`]:
            {
              borderTopLeftRadius: euiTheme.border.radius.small,
              borderTopRightRadius: euiTheme.border.radius.small,
            },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"]:has(+ [data-row-type="${rootRowAttribute}"]:not([aria-level="3"]), + [data-row-type="${childRowAttribute}"]:not([aria-level="3"])) & > *:last-child`]:
            {
              marginBottom: euiTheme.size[size],
            },

          [`[data-row-type="${childRowAttribute}"][aria-level="3"]:has(+ [data-row-type="${rootRowAttribute}"]:not([aria-level="3"]), + [data-row-type="${childRowAttribute}"]:not([aria-level="3"])) &:after`]:
            {
              height: `calc(100% - ${euiTheme.size[size]})`,
              borderBottomLeftRadius: euiTheme.border.radius.small,
              borderBottomRightRadius: euiTheme.border.radius.small,
              borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            },
        }
      : {}),
  }),
});
