/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon, useEuiTheme, IconType } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';

import { ToolbarButtonStyles, fontWeightDefinitions } from './toolbar_button.styles';

type ToolbarButtonTypes = 'primary' | 'empty';

type ToolbarButtonFontWeights = 'normal' | 'bold';

type ButtonPositions = 'left' | 'right' | 'center' | 'none';

type ButtonRenderStyle = 'standard' | 'iconButton';

interface ToolbarButtonCommonProps
  extends Pick<
    EuiButtonPropsForButton,
    'onClick' | 'onBlur' | 'iconType' | 'size' | 'data-test-subj' | 'isDisabled' | 'aria-label'
  > {
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

type ToolbarStandardButton = Pick<EuiButtonPropsForButton, 'fullWidth' | 'isLoading' | 'iconSide'> &
  Omit<ToolbarButtonCommonProps, 'label'> & {
    as?: Extract<ButtonRenderStyle, 'standard'>;
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

type ToolbarIconButton = ToolbarButtonCommonProps & {
  as: Extract<ButtonRenderStyle, 'iconButton'>;
  iconType: IconType;
  label?: string;
};

/**
 * Props for `PrimaryButton`.
 */
export type Props<T extends ButtonRenderStyle> = T extends Extract<ButtonRenderStyle, 'iconButton'>
  ? ToolbarIconButton
  : ToolbarStandardButton;

const isIconButton = (
  props: ToolbarStandardButton | ToolbarIconButton
): props is ToolbarIconButton => {
  return (props as ToolbarIconButton).as === 'iconButton';
};

const computeToolbarButtonCommonCSSProps = (
  euiTheme: ReturnType<typeof useEuiTheme>,
  {
    type,
    isDisabled,
    groupPosition,
  }: Pick<Props<ButtonRenderStyle>, 'type' | 'isDisabled' | 'groupPosition'>
) => {
  const toolButtonStyles = ToolbarButtonStyles(euiTheme);

  const groupPositionStyles =
    groupPosition && groupPosition !== 'none'
      ? toolButtonStyles.buttonPositions[groupPosition]
      : {};

  const defaultStyles = {
    ...toolButtonStyles.default,
    ...groupPositionStyles,
  };

  return isDisabled
    ? defaultStyles
    : {
        ...defaultStyles,
        ...(type === 'primary' ? {} : toolButtonStyles.emptyButton),
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
  ...rest
}: Omit<ToolbarStandardButton, 'as'>) => {
  const euiTheme = useEuiTheme();
  const cssProps = {
    ...computeToolbarButtonCommonCSSProps(euiTheme, { type, isDisabled, groupPosition }),
    fontWeight: fontWeightDefinitions(euiTheme.euiTheme)[fontWeight],
  };

  const toolbarButtonStyleProps: EuiButtonPropsForButton = isDisabled
    ? {}
    : type === 'primary'
    ? { color: 'primary', fill: true }
    : { color: 'text' };

  const icon = iconType ?? (hasArrow ? 'arrowDown' : '');

  return (
    <EuiButton
      size={rest.size}
      isDisabled={isDisabled}
      css={cssProps}
      iconType={icon}
      iconSide={iconType ? iconSide : 'right'}
      fullWidth={fullWidth}
      contentProps={fullWidth ? { style: { justifyContent: 'space-between' } } : {}}
      {...toolbarButtonStyleProps}
      {...rest}
    >
      {label}
    </EuiButton>
  );
};

const ToolbarIconButton = ({
  size,
  type,
  label,
  isDisabled,
  groupPosition,
  ...rest
}: Omit<ToolbarIconButton, 'as'>) => {
  const euiTheme = useEuiTheme();
  const cssProps = computeToolbarButtonCommonCSSProps(euiTheme, {
    type,
    isDisabled,
    groupPosition,
  });

  return (
    <EuiButtonIcon
      {...rest}
      disabled={isDisabled}
      aria-label={label ?? rest['aria-label']}
      size={size}
      iconSize={size}
      css={cssProps}
      display={type === 'primary' ? 'fill' : 'base'}
      color={type === 'primary' ? 'primary' : 'text'}
    />
  );
};

export function ToolbarButton<T extends ButtonRenderStyle>(props: Props<T>) {
  const { type = 'empty', size = 'm' } = props;

  if (isIconButton(props)) {
    return <ToolbarIconButton {...props} size={size} type={type} />;
  }

  return <ToolbarStandardButton {...props} size={size} type={type} />;
}
