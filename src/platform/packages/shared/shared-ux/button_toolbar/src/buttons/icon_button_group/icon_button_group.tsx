/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonGroupOptionProps, IconType, EuiButtonGroupProps } from '@elastic/eui';
import { EuiButtonGroup, htmlIdGenerator, useEuiTheme } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import { getIconButtonStyles, getIconButtonGroupStyles } from './icon_button_group.styles';

/**
 * An interface representing a single icon button in the `IconButtonGroup`.
 */
export interface IconButton {
  /** The accessible button label. */
  label: string;
  /** EUI `IconType` to display. */
  iconType: IconType;
  /** Handler for button click. */
  onClick: () => void;
  /**
   * HTML `title` attribute for the native browser tooltip. Defaults to `label`.
   * Ignored when `toolTipContent` is provided — the native tooltip is suppressed
   * so only the `EuiToolTip` is shown.
   */
  title?: string;
  /** Test subject for button */
  'data-test-subj'?: string;
  /** To disable the action **/
  isDisabled?: boolean;
  /** Tooltip content */
  toolTipContent?: EuiButtonGroupOptionProps['toolTipContent'];
  /** Tooltip props */
  toolTipProps?: EuiButtonGroupOptionProps['toolTipProps'];
  /** A11y for button */
  'aria-expanded'?: boolean;
  /** A11y for button */
  'aria-controls'?: string;
  /** CSS for the button */
  css?: SerializedStyles;
}

/**
 * Props for `IconButtonGroup`.
 */
export interface Props {
  /** Required accessible legend for the whole group */
  legend: EuiButtonGroupProps['legend'];
  /** Array of `IconButton` */
  buttons: IconButton[];
  /** Button size */
  buttonSize?: EuiButtonGroupProps['buttonSize'];
  /** Test subject for button group */
  'data-test-subj'?: string;
  /** CSS for the button group */
  css?: SerializedStyles;
}

type Option = EuiButtonGroupOptionProps & Omit<IconButton, 'label' | 'css'>;

/**
 * A group of buttons each performing an action, represented by an icon.
 */
export const IconButtonGroup = ({
  buttons,
  legend,
  buttonSize = 'm',
  'data-test-subj': dataTestSubj,
  css: buttonGroupCss,
}: Props) => {
  const euiTheme = useEuiTheme();
  const iconButtonStyles = getIconButtonStyles(euiTheme);
  const iconButtonGroupStyles = getIconButtonGroupStyles(euiTheme);

  const buttonGroupOptions: Option[] = buttons.map((button: IconButton, index) => {
    const { label, title, toolTipContent, css: buttonCss, ...rest } = button;
    // EuiButtonGroupButton defaults the native `title` to the button text. When a
    // consumer provides `toolTipContent`, suppress that native tooltip (via
    // `title: ''`) so the EuiToolTip is the only tooltip shown.
    return {
      ...rest,
      'aria-label': title ?? label,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title: toolTipContent !== undefined ? '' : title ?? label,
      toolTipContent,
      css: css`
        ${iconButtonStyles};
        ${buttonCss ? buttonCss : ''}
      `,
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  return (
    <EuiButtonGroup
      data-test-subj={dataTestSubj}
      buttonSize={buttonSize}
      legend={legend}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
      css={css`
        ${iconButtonGroupStyles};
        ${buttonGroupCss ? buttonGroupCss : ''}
      `}
    />
  );
};
