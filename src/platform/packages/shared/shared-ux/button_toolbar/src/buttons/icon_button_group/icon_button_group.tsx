/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonGroup,
  htmlIdGenerator,
  EuiButtonGroupOptionProps,
  useEuiTheme,
  IconType,
  EuiButtonGroupProps,
} from '@elastic/eui';

import { IconButtonGroupStyles } from './icon_button_group.styles';

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
  /** HTML `title` attribute for tooltips if different from `label` */
  title?: string;
  /** Test subject for button */
  'data-test-subj'?: string;
  /** To disable the action **/
  isDisabled?: boolean;
  /** A11y for button */
  'aria-expanded'?: boolean;
  /** A11y for button */
  'aria-controls'?: string;
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
}

type Option = EuiButtonGroupOptionProps & Omit<IconButton, 'label'>;

/**
 * A group of buttons each performing an action, represented by an icon.
 */
export const IconButtonGroup = ({
  buttons,
  legend,
  buttonSize = 'm',
  'data-test-subj': dataTestSubj,
}: Props) => {
  const euiTheme = useEuiTheme();
  const iconButtonGroupStyles = IconButtonGroupStyles(euiTheme);

  const buttonGroupOptions: Option[] = buttons.map((button: IconButton, index) => {
    const { label, title = label, ...rest } = button;
    return {
      ...rest,
      'aria-label': title ?? label,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title,
      css: [iconButtonGroupStyles.button],
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
      css={iconButtonGroupStyles.buttonGroup}
    />
  );
};
