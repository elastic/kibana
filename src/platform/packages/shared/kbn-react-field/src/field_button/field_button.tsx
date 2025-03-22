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

import {
  CommonProps,
  useEuiFontSize,
  useEuiFocusRing,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';

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

export const SIZES: ButtonSize[] = ['xs', 's'];

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
  const { euiTheme } = useEuiTheme();
  const classes = classNames('kbnFieldButton', className); // kbnFieldButton class is used in tests and draggable styles

  const contentClasses = classNames('kbn-resetFocusState', 'kbnFieldButton__button'); // kbnFieldButton__button class is dependent styles
  const fieldButtonContentCss = () => css`
    flex-grow: 1;
    text-align: left;
    padding: ${size === 'xs' ? euiTheme.size.xs : euiTheme.size.s} 0;
    display: flex;
    align-items: flex-start;
    line-height: normal;
  `;

  const euiFocusRing = useEuiFocusRing();
  const buttonFontSize = useEuiFontSize(size);

  const innerContent = (
    <>
      {fieldIcon && <span css={fieldIconCss}>{fieldIcon}</span>}
      {fieldName && (
        <span
          className="kbnFieldButton__name eui-textBreakAll" // kbnFieldButton__name class is used in functional tests
          css={fieldNameCss}
        >
          <span className="kbnFieldButton__nameInner">{fieldName}</span>
        </span>
      )}
      {fieldInfoIcon && (
        <div
          className="kbnFieldButton__infoIcon" // kbnFieldButton__infoIcon class is used in unit test
          css={fieldInfoIconCss}
        >
          {fieldInfoIcon}
        </div>
      )}
    </>
  );

  return (
    <div
      className={classes}
      css={css`
        ${buttonFontSize}
        border-radius: ${euiTheme.border.radius};
        margin-bottom: ${euiTheme.size.xs};
        display: flex;
        align-items: flex-start;
        padding-block: 0;
        padding-inline: ${flush === 'both' ? 0 : euiTheme.size.s};
        transition: box-shadow ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

        &:focus-within {
          ${euiFocusRing}
        }
        ${isActive && euiFocusRing}
      `}
      {...rest}
    >
      {dragHandle && (
        <div
          css={css`
            margin-right: ${size === 'xs' ? undefined : euiTheme.size.s};
            line-height: ${size === 'xs' ? euiTheme.size.l : euiTheme.size.xl};
          `}
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
          css={fieldButtonContentCss}
          {...buttonProps}
        >
          {innerContent}
        </button>
      ) : (
        <div className={contentClasses} css={fieldButtonContentCss} data-test-subj={dataTestSubj}>
          {innerContent}
        </div>
      )}

      {fieldAction && (
        <div
          css={css`
            margin-left: ${size === 'xs' ? euiTheme.size.xs : euiTheme.size.s};
            line-height: ${size === 'xs' ? euiTheme.size.l : euiTheme.size.xl};
          `}
        >
          {fieldAction}
        </div>
      )}
    </div>
  );
}

const fieldIconCss = css`
  flex-shrink: 0;
  line-height: 0;
`;

const fieldNameCss = ({ euiTheme }: UseEuiTheme) => css`
  flex-grow: 1;
  padding: 0 ${euiTheme.size.s};
`;

const fieldInfoIconCss = ({ euiTheme }: UseEuiTheme) => css`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${euiTheme.size.base};
  flex-shrink: 0;
  line-height: 0;
`;
