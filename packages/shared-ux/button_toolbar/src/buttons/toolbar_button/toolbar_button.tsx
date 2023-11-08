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

import { ToolbarButtonStyles } from './toolbar_button.styles';

type ToolbarButtonTypes = 'primary' | 'empty';

type ToolbarButtonFontWeights = 'normal' | 'bold';

type ButtonPositions = 'left' | 'right' | 'center' | 'none';

type ButtonRenderStyle = 'standard' | 'iconButton';

interface AbstractToolbarButtonProps
  extends Pick<
    EuiButtonPropsForButton,
    'onClick' | 'iconType' | 'iconSide' | 'size' | 'data-test-subj' | 'isDisabled'
  > {
  /**
   * Render style of the toolbar button
   */
  as?: ButtonRenderStyle;
  label?: string;
  type?: ToolbarButtonTypes;
  /**
   * Determines prominence
   */
  fontWeight?: ToolbarButtonFontWeights;
  /**
   * Adjusts the borders for groupings
   */
  groupPosition?: ButtonPositions;
}

/**
 * Props for `PrimaryButton`.
 */
export type Props<T extends ButtonRenderStyle> = T extends Extract<ButtonRenderStyle, 'standard'>
  ? {
      as?: Extract<ButtonRenderStyle, 'standard'>;
      /**
       * Display text for toolbar button
       */
      label: React.ReactNode;
    } & Omit<AbstractToolbarButtonProps, 'label'> &
      Pick<EuiButtonPropsForButton, 'fullWidth' | 'isLoading'>
  : T extends Extract<ButtonRenderStyle, 'iconButton'>
  ? {
      as: Extract<ButtonRenderStyle, 'iconButton'>;
      iconType: IconType;
    } & AbstractToolbarButtonProps
  : never;

const computeToolbarButtonCSSProps = (
  euiTheme: ReturnType<typeof useEuiTheme>,
  {
    type,
    isDisabled,
    fontWeight,
    groupPosition,
  }: Pick<Props<ButtonRenderStyle>, 'type' | 'isDisabled' | 'fontWeight' | 'groupPosition'>
) => {
  const toolButtonStyles = ToolbarButtonStyles(euiTheme);

  const groupPositionStyles =
    groupPosition && groupPosition !== 'none'
      ? toolButtonStyles.buttonPositions[groupPosition]
      : {};

  const fontWeightStyles =
    fontWeight === 'bold' ? toolButtonStyles.fontWeight.bold : toolButtonStyles.fontWeight.normal;

  const defaultStyles = {
    ...toolButtonStyles.default,
    ...groupPositionStyles,
    fontWeight: fontWeightStyles,
  };

  return isDisabled
    ? defaultStyles
    : {
        ...defaultStyles,
        ...(type === 'primary' ? {} : toolButtonStyles.emptyButton),
      };
};

export function ToolbarButton<T extends ButtonRenderStyle>({
  as = 'standard',
  type = 'empty',
  iconSide = 'left',
  size = 'm',
  fontWeight = 'normal',
  groupPosition,
  isDisabled,
  label,
  ...rest
}: Props<T>) {
  const euiTheme = useEuiTheme();
  const cssProps = computeToolbarButtonCSSProps(euiTheme, {
    type,
    isDisabled,
    fontWeight,
    groupPosition,
  });

  const toolbarButtonStyleProps: EuiButtonPropsForButton = !isDisabled
    ? type === 'primary'
      ? { color: 'primary', fill: true }
      : { color: 'text' }
    : {};

  if (as === 'iconButton') {
    return (
      <EuiButtonIcon
        aria-label={label as string}
        size={size}
        css={cssProps}
        isDisabled={isDisabled}
        iconType={rest.iconType!}
        iconSize={size}
        display={type === 'primary' ? 'fill' : 'base'}
        color={type === 'primary' ? 'primary' : 'text'}
        {...rest}
      />
    );
  }

  return (
    <EuiButton
      size={size}
      isDisabled={isDisabled}
      textProps={{ style: { lineHeight: '100%' } }}
      css={cssProps}
      {...toolbarButtonStyleProps}
      {...{ iconSide, ...rest }}
    >
      {label}
    </EuiButton>
  );
}
