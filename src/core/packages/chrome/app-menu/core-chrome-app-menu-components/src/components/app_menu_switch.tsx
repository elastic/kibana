/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AppMenuSwitch } from '../types';
import { getTooltip } from '../utils';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';

interface AppMenuSwitchComponentProps {
  switchConfig: AppMenuSwitch;
}

export const AppMenuSwitchComponent = ({ switchConfig }: AppMenuSwitchComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    id,
    label,
    labelProps,
    checked,
    onChange,
    disabled,
    tooltipContent,
    tooltipTitle,
    'data-test-subj': dataTestSubj,
  } = switchConfig;

  const switchCss = css`
    margin-right: ${euiTheme.size.s};
  `;

  const handleChange = (e: EuiSwitchEvent) => {
    onChange(e.target.checked);
  };

  const { title, content } = getTooltip({ tooltipContent, tooltipTitle });
  const showTooltip = Boolean(content || title);

  const switchElement = (
    <EuiSwitch
      id={id}
      label={label}
      labelProps={labelProps}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      compressed
      css={switchCss}
      data-test-subj={dataTestSubj ?? APP_MENU_TEST_SUBJECTS.switch}
    />
  );

  return showTooltip ? (
    <EuiToolTip content={content} title={title}>
      {switchElement}
    </EuiToolTip>
  ) : (
    switchElement
  );
};
