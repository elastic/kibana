/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export interface IconButton {
  /**
   * The accessible button label
   */
  label: string;
  /**
   * EUI `IconType` to display
   */
  iconType: IconType;
  onClick: () => void;
  /**
   * HTML `title` attribute for tooltips if different from `label`
   */
  title?: string;
}

export interface Props {
  /**
   * Required accessible legend for the whole group
   */
  legend: EuiButtonGroupProps['legend'];
  /**
   * Array of `QuickButton`s
   */
  buttons: IconButton[];
}

type Option = EuiButtonGroupOptionProps & Omit<IconButton, 'label'>;

export const IconButtonGroup = ({ buttons, legend }: Props) => {
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
      buttonSize="m"
      legend={legend}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
    />
  );
};
