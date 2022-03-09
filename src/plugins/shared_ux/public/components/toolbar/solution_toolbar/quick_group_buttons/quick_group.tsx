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
} from '@elastic/eui';
import { QuickGroupButtonStyles } from './quick_group.styles';
export interface QuickButton {
  label: string;
  title?: string;
  onClick: () => void;
  iconType: IconType;
  getLegend: string;
}

export interface Props {
  buttons: QuickButton[];
}

type Option = EuiButtonGroupOptionProps & Omit<QuickButton, 'label'>;

export const QuickButtonGroup = ({ buttons }: Props) => {
  const euiTheme = useEuiTheme();
  const quickButtonGroupStyles = QuickGroupButtonStyles(euiTheme);

  const buttonGroupOptions: Option[] = buttons.map((button: QuickButton, index) => {
    const { label, title = label, ...rest } = button;

    return {
      ...rest,
      'aria-label': title ?? label,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title,
      css: [quickButtonGroupStyles.button],
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  const getLegend = buttonGroupOptions[0].getLegend;

  return (
    <EuiButtonGroup
      buttonSize="m"
      legend={getLegend}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
    />
  );
};
