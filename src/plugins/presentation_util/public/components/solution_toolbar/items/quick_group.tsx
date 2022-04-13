/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonGroup, htmlIdGenerator, EuiButtonGroupOptionProps } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n/components';

const { QuickButtonGroup: strings } = ComponentStrings;

import './quick_group.scss';

export interface QuickButtonProps extends Pick<EuiButtonGroupOptionProps, 'iconType'> {
  createType: string;
  onClick: () => void;
}

export interface Props {
  buttons: QuickButtonProps[];
}

type Option = EuiButtonGroupOptionProps & Omit<QuickButtonProps, 'createType'>;

export const QuickButtonGroup = ({ buttons }: Props) => {
  const buttonGroupOptions: Option[] = buttons.map((button: QuickButtonProps, index) => {
    const { createType: label, ...rest } = button;
    const title = strings.getAriaButtonLabel(label);

    return {
      ...rest,
      'aria-label': title,
      className: `quickButtonGroup__button`,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title,
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  return (
    <EuiButtonGroup
      buttonSize="m"
      className="quickButtonGroup"
      legend={strings.getLegend()}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
    />
  );
};
