/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { CommonProps } from '@elastic/eui';
import './field_button.scss';

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

const sizeToClassNameMap = {
  xs: 'kbnFieldButton--xs',
  s: 'kbnFieldButton--s',
} as const;

export type ButtonSize = keyof typeof sizeToClassNameMap;

export const SIZES = Object.keys(sizeToClassNameMap) as ButtonSize[];

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
  const classes = classNames(
    'kbnFieldButton',
    size ? sizeToClassNameMap[size] : null,
    {
      'kbnFieldButton-isActive': isActive,
      'kbnFieldButton--flushBoth': flush === 'both',
    },
    className
  );

  const contentClasses = classNames('kbn-resetFocusState', 'kbnFieldButton__button');

  const innerContent = (
    <>
      {fieldIcon && <span className="kbnFieldButton__fieldIcon">{fieldIcon}</span>}
      {fieldName && (
        <span className="kbnFieldButton__name eui-textBreakAll">
          <span className="kbnFieldButton__nameInner">{fieldName}</span>
        </span>
      )}
      {fieldInfoIcon && <div className="kbnFieldButton__infoIcon">{fieldInfoIcon}</div>}
    </>
  );

  return (
    <div className={classes} {...rest}>
      {dragHandle && <div className="kbnFieldButton__dragHandle">{dragHandle}</div>}
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
          {...buttonProps}
        >
          {innerContent}
        </button>
      ) : (
        <div className={contentClasses} data-test-subj={dataTestSubj}>
          {innerContent}
        </div>
      )}

      {fieldAction && <div className="kbnFieldButton__fieldAction">{fieldAction}</div>}
    </div>
  );
}
