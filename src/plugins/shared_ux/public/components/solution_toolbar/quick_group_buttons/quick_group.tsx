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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const strings = {
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
  const { euiTheme } = useEuiTheme();
  const buttonGroupOptions: Option[] = buttons.map((button: QuickButtonProps, index) => {
    const { createType: label, ...rest } = button;
    const title = strings.getAriaButtonLabel(label);

    return {
      ...rest,
      'aria-label': title,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title,
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  const quickButtonCSS = css`
    border-radius: ${euiTheme.border.radius};
    background-color: ${euiTheme.colors.emptyShade};
    border-color: ${euiTheme.border.color};
  `;

  return (
    <EuiButtonGroup
      buttonSize="m"
      legend={strings.getLegend()}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
      css={quickButtonCSS}
    />
  );
};
