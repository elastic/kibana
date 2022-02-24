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

import cx from 'classnames';

import './quick_group.scss';
import className from 'classnames';

const strings = {
  getAriaButtonLabel: (createType: string) =>
    i18n.translate('sharedUX.solutionToolbar.quickButton.ariaButtonLabel', {
      defaultMessage: `Create new {createType}`,
      values: {
        createType,
      },
    }),
  getLegend: () =>
    i18n.translate('sharedUX.solutionToolbar.quickButton.legendLabel', {
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
      className: `quickButtonGroup__button`,
    };
  });

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  const quickButtonCSS = css`
  & .quickButtonGroup {
    & .euiButtonGroup__buttons {
    border-radius: ${euiTheme.border.radius};
      & .quickButtonGroup__button {
        background-color: ${euiTheme.colors.emptyShade};
        border-width: ${euiTheme.border.width.thin} !important;
        border-style: solid !important;
        border-color: ${euiTheme.border.color} !important;
      }
    & .quickButtonGroup__button:first-of-type {
      border-top-left-radius: ${euiTheme.border.radius} !important;
      border-bottom-left-radius: ${euiTheme.border.radius} !important;
    }
    & .quickButtonGroup__button:last-of-type {
      border-top-right-radius: ${euiTheme.border.radius} !important;
      border-bottom-right-radius: ${euiTheme.border.radius} !important;
    }
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
      className={cx('quickButtonGroup', className)}
    />
  );
};
