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
import { css } from '@emotion/react';
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
  const { euiTheme } = useEuiTheme();

  const buttonGroupOptions: Option[] = buttons.map((button: QuickButton, index) => {
    const { label, title = label, ...rest } = button;

    return {
      ...rest,
      'aria-label': title ?? label,
      id: `${htmlIdGenerator()()}${index}`,
      label,
      title,
      className: `quickButtonGroup__button`,
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  const quickButtonCSS = css`
    .euiButtonGroup__buttons {
      border-radius: ${euiTheme.border.radius};
      .quickButtonGroup__button {
        background-color: ${euiTheme.colors.emptyShade};
        border-width: ${euiTheme.border.width.thin} !important;
        border-style: solid !important;
        border-color: ${euiTheme.border.color} !important;
      }
      .quickButtonGroup__button:first-of-type {
        border-top-left-radius: ${euiTheme.border.radius.medium} !important;
        border-bottom-left-radius: ${euiTheme.border.radius.medium} !important;
      }
      .quickButtonGroup__button:last-of-type {
        border-top-right-radius: ${euiTheme.border.radius.medium} !important;
        border-bottom-right-radius: ${euiTheme.border.radius.medium} !important;
      }
    }
  `;

  return (
    <EuiButtonGroup
      buttonSize="m"
      // set this as a constant?
      legend={buttonGroupOptions[0].getLegend}
      options={buttonGroupOptions}
      onChange={onChangeIconsMulti}
      type="multi"
      isIconOnly
      css={quickButtonCSS}
    />
  );
};
