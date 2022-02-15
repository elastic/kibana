/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonGroup, htmlIdGenerator, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  QuickButtonGroup: {
    getAriaButtonLabel: (createType: string) =>
      i18n.translate('presentationUtil.solutionToolbar.quickButton.ariaButtonLabel', {
        defaultMessage: `Create new {createType}`,
        values: {
          createType,
        },
      }),
    getLegend: () =>
      i18n.translate('presentationUtil.solutionToolbar.quickButton.legendLabel', {
        defaultMessage: 'Quick create',
      }),
  },
};
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
    const title = strings.QuickButtonGroup.getAriaButtonLabel(label);

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
      legend={strings.QuickButtonGroup.getLegend()}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
    />
  );
};
