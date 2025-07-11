/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { css } from '@emotion/react';
import { euiFocusRing, euiFontSize, type CommonProps, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export interface FieldButtonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Label for the button
   */
  fieldName: ReactNode;
  /**
   * Icon representing the field type.
   * Recommend using FieldIcon
   */
  fieldIcon?: ReactNode;
  /**
   * An optional node to place inside and at the end of the <button>
   */
  fieldInfoIcon?: ReactNode;
  /**
   * An optional node to place outside of and to the right of the <button>
   */
  fieldAction?: ReactNode;
  /**
   * Adds a forced focus ring to the whole component
   */
  isActive?: boolean;
  /**
   * Custom drag handle element
   */
  dragHandle?: React.ReactElement;
  /**
   * Use the xs size in condensed areas
   */
  size: ButtonSize;
  /**
   * Whether to skip side paddings
   */
  flush?: 'both';
  /**
   * Custom class name
   */
  className?: string;
  /**
   * The component will render a `<button>` when provided an `onClick`
   */
  onClick?: () => void;
  /**
   * Applies to the inner `<button>`  or `<div>`
   */
  dataTestSubj?: string;
  /**
   * Pass more button props to the `<button>` element
   */
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;
}

export type ButtonSize = 'xs' | 's';

export function FieldButton({
  size,
  isActive = false,
  fieldIcon,
  fieldName,
  fieldInfoIcon,
  fieldAction,
  flush,
  className,
  dragHandle,
  onClick,
  dataTestSubj,
  buttonProps,
  ...rest
}: FieldButtonProps) {
  const styles = useMemoCss(componentStyles);

  const classes = classNames(
    'kbnFieldButton',
    {
      kbnFieldButtonIsActive: isActive,
    },
    className
  );

  const contentClasses = classNames('kbn-resetFocusState', 'kbnFieldButton__button');

  const innerContent = (
    <>
      {fieldIcon && (
        <span data-test-subj="kbnFieldButton_fieldIcon" css={styles.fieldIcon}>
          {fieldIcon}
        </span>
      )}
      {fieldName && (
        <span className="kbnFieldButton__name eui-textBreakAll" css={styles.buttonName}>
          <span className="kbnFieldButton__nameInner">{fieldName}</span>
        </span>
      )}
      {fieldInfoIcon && (
        <div css={styles.infoIcon} data-test-subj="kbnFieldButton_fieldInfoIcon">
          {fieldInfoIcon}
        </div>
      )}
    </>
  );

  return (
    <div
      className={classes}
      css={[
        styles.fieldButtonWrapper,
        size === 'xs' && styles.fieldButtonWrapperXs,
        flush === 'both' && styles.buttonFlushBoth,
      ]}
      {...rest}
    >
      {dragHandle && (
        <div
          data-test-subj="kbnFieldButton_dragHandle"
          css={[styles.dragHandle, size === 'xs' && styles.dragHandleXs]}
        >
          {dragHandle}
        </div>
      )}
      {onClick ? (
        <button
          onClick={(e) => {
            if (e.type === 'click') {
              e.currentTarget.focus();
            }
            onClick();
          }}
          data-test-subj={dataTestSubj}
          className={contentClasses}
          css={[styles.fieldButton, size === 'xs' && styles.fieldButtonXs]}
          {...buttonProps}
        >
          {innerContent}
        </button>
      ) : (
        <div
          className={contentClasses}
          css={[styles.fieldButton, size === 'xs' && styles.fieldButtonXs]}
          data-test-subj={dataTestSubj}
        >
          {innerContent}
        </div>
      )}

      {fieldAction && (
        <div
          data-test-subj="kbnFieldButton_fieldAction"
          css={[styles.fieldAction, size === 'xs' && styles.fieldActionXs]}
        >
          {fieldAction}
        </div>
      )}
    </div>
  );
}

const componentStyles = {
  fieldButtonWrapper: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');

    return css({
      fontSize,
      borderRadius: euiTheme.border.radius.medium,
      marginBottom: euiTheme.size.xs,
      padding: `0 ${euiTheme.size.s}`,
      display: 'flex',
      alignItems: 'flex-start',
      transition: `box-shadow ${euiTheme.animation.fast} ${euiTheme.animation.resistance}, background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance}`,

      '&:focusWithin': euiFocusRing(themeContext),
      '&.kbnFieldButtonIsActive': euiFocusRing(themeContext),
    });
  },
  fieldButtonWrapperXs: (themeContext: UseEuiTheme) => {
    const { fontSize } = euiFontSize(themeContext, 'xs');
    return css({
      fontSize,
    });
  },
  fieldButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexGrow: 1,
      textAlign: 'left',
      padding: `${euiTheme.size.s} 0`,
      display: 'flex',
      alignItems: 'flex-start',
      lineHeight: 'normal',
    }),
  fieldButtonXs: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.xs} 0`,
    }),
  fieldIcon: css({
    flexShrink: 0,
    lineHeight: 0,
  }),
  buttonName: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexGrow: 1,
      padding: `0 ${euiTheme.size.s}`,
    }),
  infoIcon: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: euiTheme.size.base,
      flexShrink: 0,
      lineHeight: 0,
    }),
  fieldAction: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: euiTheme.size.s,
      lineHeight: euiTheme.size.xl,
    }),
  fieldActionXs: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: euiTheme.size.xs,
      lineHeight: euiTheme.size.l,
    }),
  dragHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginRight: euiTheme.size.s,
      lineHeight: euiTheme.size.xl,
    }),
  dragHandleXs: ({ euiTheme }: UseEuiTheme) =>
    css({
      lineHeight: euiTheme.size.l,
    }),
  buttonFlushBoth: css({
    paddingInline: 0,
  }),
};
