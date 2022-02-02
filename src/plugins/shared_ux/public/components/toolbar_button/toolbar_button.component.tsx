/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import './toolbar_button.scss';
import { EuiButton, PropsOf, EuiButtonProps } from '@elastic/eui';
import classNames from 'classnames';

export const TOOLBAR_BUTTON_SIZES: Array<EuiButtonProps['size']> = ['s', 'm'];

const groupPositionToClassMap = {
  none: null,
  left: 'kbnToolbarButton--groupLeft',
  center: 'kbnToolbarButton--groupCenter',
  right: 'kbnToolbarButton--groupRight',
};

type ButtonPositions = keyof typeof groupPositionToClassMap;

export const POSITIONS = Object.keys(groupPositionToClassMap) as ButtonPositions[];

export const WEIGHTS = ['normal', 'bold'] as Weights[];

type Weights = 'normal' | 'bold';

/**
 * Props for the Toolbar button component.
 */
export type ToolbarButtonProps = PropsOf<typeof EuiButton> & {
  classes?: string;
  /**
   * Determines prominence
   */
  fontWeight?: Weights;
  /**
   * Smaller buttons also remove extra shadow for less prominence
   */
  size?: EuiButtonProps['size'];
  /**
   * Determines if the button will have a down arrow or not
   */
  hasArrow?: boolean;
  /**
   * Adjusts the borders for groupings
   */
  dataTestSubj?: string;
  /**
   * Adjusts the borders for groupings
   */
  groupPosition?: ButtonPositions;
};

/**
 * A presentational component that renders a toolbar button.
 */
export const ToolbarButton = ({
  children,
  className,
  fontWeight = 'normal',
  size = 'm',
  hasArrow = true,
  groupPosition = 'none',
  dataTestSubj = '',
  ...rest
}: ToolbarButtonProps) => {
  const classes = classNames(
    'kbnToolbarButton',
    groupPositionToClassMap[groupPosition],
    [`kbnToolbarButton--${fontWeight}`, `kbnToolbarButton--${size}`],
    className
  );

  return (
    <EuiButton
      data-test-subj={dataTestSubj}
      className={classes}
      iconSide="right"
      iconType={hasArrow ? 'arrowDown' : ''}
      color="text"
      contentProps={{
        className: 'kbnToolbarButton__content',
      }}
      textProps={{
        className: 'kbnToolbarButton__text',
      }}
      {...rest}
      size={size}
    >
      {children}
    </EuiButton>
  );
};
