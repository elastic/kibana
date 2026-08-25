/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButton, EuiButtonIcon, useEuiTheme } from '@elastic/eui';

import { ToolbarButtonStyles, fontWeightDefinitions } from './toolbar_button.styles';

type ToolbarButtonTypes = 'primary' | 'empty';

type ToolbarButtonFontWeights = 'normal' | 'bold';

type ButtonPositions = 'left' | 'right' | 'center' | 'none';

type ButtonRenderStyle = 'standard' | 'iconButton';

interface ToolbarButtonCommonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  iconType?: IconType;
  size?: 's' | 'm';
  'data-test-subj'?: string;
  isDisabled?: boolean;
  'aria-label'?: string;
  id?: string;
  /**
   * Render style of the toolbar button
   */
  as?: ButtonRenderStyle;
  type?: ToolbarButtonTypes;
  /**
   * Adjusts the borders for groupings
   */
  groupPosition?: ButtonPositions;
}

type ToolbarStandardButton = ToolbarButtonCommonProps & {
  as?: Extract<ButtonRenderStyle, 'standard'>;
  fullWidth?: boolean;
  isLoading?: boolean;
  iconSide?: 'left' | 'right';
  /**
   * Display text for toolbar button
   */
  label: React.ReactNode;
  /**
   * Determines if the button will have a down arrow or not
   */
  hasArrow?: boolean;
  /**
   * Determines prominence
   */
  fontWeight?: ToolbarButtonFontWeights;
};

type ToolbarIconButton = {
  as: Extract<ButtonRenderStyle, 'iconButton'>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  iconType: IconType;
  size?: 's' | 'm';
  'data-test-subj'?: string;
  isDisabled?: boolean;
  'aria-label'?: string;
  id?: string;
  type?: ToolbarButtonTypes;
  groupPosition?: ButtonPositions;
  label?: string;
};

/**
 * Props for `PrimaryButton`.
 */
export type Props<T extends ButtonRenderStyle> = T extends Extract<ButtonRenderStyle, 'iconButton'>
  ? ToolbarIconButton
  : ToolbarStandardButton;

const isIconButton = (props: { as?: ButtonRenderStyle }): props is ToolbarIconButton => {
  return props.as === 'iconButton';
};

const computeToolbarButtonCommonCSSProps = (
  euiTheme: ReturnType<typeof useEuiTheme>,
  {
    type,
    isDisabled,
    groupPosition,
  }: {
    type?: ToolbarButtonTypes;
    isDisabled?: boolean;
    groupPosition?: ButtonPositions;
  }
) => {
  const toolButtonStyles = ToolbarButtonStyles(euiTheme);

  const groupPositionStyles =
    groupPosition && groupPosition !== 'none'
      ? toolButtonStyles.buttonPositions[groupPosition]
      : {};

  const defaultStyles = {
    ...(type === 'primary' ? {} : toolButtonStyles.default),
    ...groupPositionStyles,
  };

  return isDisabled
    ? defaultStyles
    : {
        ...defaultStyles,
        ...(type === 'empty' ? toolButtonStyles.emptyButton : {}),
      };
};

const ToolbarStandardButton = ({
  hasArrow = true,
  fontWeight = 'normal',
  type,
  label,
  iconSide,
  iconType,
  fullWidth,
  isDisabled,
  groupPosition,
  size,
  onClick,
  onBlur,
  isLoading,
  id,
  'data-test-subj': dataTestSubj,
  'aria-label': ariaLabel,
}: Omit<ToolbarStandardButton, 'as'>) => {
  const euiTheme = useEuiTheme();
  const cssProps = {
    ...computeToolbarButtonCommonCSSProps(euiTheme, { type, isDisabled, groupPosition }),
    fontWeight: fontWeightDefinitions(euiTheme.euiTheme)[fontWeight],
  };

  const icon = iconType ?? (hasArrow ? 'chevronSingleDown' : undefined);

  return (
    <EuiButton
      size={size}
      isDisabled={isDisabled}
      css={cssProps}
      iconType={icon}
      iconSide={iconType ? iconSide : 'right'}
      fullWidth={fullWidth}
      contentProps={fullWidth ? { style: { justifyContent: 'space-between' } } : {}}
      color={isDisabled ? undefined : type === 'primary' ? 'primary' : 'text'}
      fill={!isDisabled && type === 'primary'}
      onClick={onClick}
      onBlur={onBlur}
      isLoading={isLoading}
      id={id}
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
    >
      {label}
    </EuiButton>
  );
};

const ToolbarIconButtonComponent = ({
  size,
  type,
  label,
  isDisabled,
  groupPosition,
  iconType,
  onClick,
  onBlur,
  id,
  'data-test-subj': dataTestSubj,
  'aria-label': ariaLabel,
}: {
  size?: 's' | 'm';
  type?: ToolbarButtonTypes;
  label?: string;
  isDisabled?: boolean;
  groupPosition?: ButtonPositions;
  iconType: IconType;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  id?: string;
  'data-test-subj'?: string;
  'aria-label'?: string;
}) => {
  const euiTheme = useEuiTheme();
  const cssProps = computeToolbarButtonCommonCSSProps(euiTheme, {
    type,
    isDisabled,
    groupPosition,
  });

  return (
    <EuiButtonIcon
      iconType={iconType}
      onClick={onClick}
      onBlur={onBlur}
      id={id}
      data-test-subj={dataTestSubj}
      disabled={isDisabled}
      aria-label={label ?? ariaLabel}
      size={size}
      iconSize={size}
      css={cssProps}
      display={type === 'primary' ? 'fill' : 'base'}
      color={type === 'primary' ? 'primary' : 'text'}
    />
  );
};

export function ToolbarButton(props: ToolbarStandardButton): JSX.Element;
export function ToolbarButton(props: ToolbarIconButton): JSX.Element;
export function ToolbarButton(props: ToolbarStandardButton | ToolbarIconButton) {
  const { type = 'empty', size = 'm' } = props;

  if (isIconButton(props)) {
    return <ToolbarIconButtonComponent {...props} size={size} type={type} />;
  }

  return <ToolbarStandardButton {...props} size={size} type={type} />;
}
