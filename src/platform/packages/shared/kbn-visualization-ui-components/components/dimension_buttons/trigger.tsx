/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EuiTextProps } from '@elastic/eui/src/components/text/text';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { emptyTitleText } from './constants';

export const defaultDimensionTriggerTooltip = (
  <p>
    {i18n.translate('visualizationUiComponents.configure.invalidConfigTooltip', {
      defaultMessage: 'Invalid configuration.',
    })}
    <br />
    {i18n.translate('visualizationUiComponents.configure.invalidConfigTooltipClick', {
      defaultMessage: 'Click for more details.',
    })}
  </p>
);

export const DimensionTrigger = ({
  id,
  label,
  color,
  dataTestSubj,
}: {
  label: React.ReactNode;
  id?: string;
  color?: EuiTextProps['color'];
  dataTestSubj?: string;
}) => {
  let safeLabel = label;
  if (typeof label === 'string') {
    safeLabel = label?.trim().length > 0 ? label : emptyTitleText;
  }
  return (
    <EuiText
      size="s"
      id={id}
      color={color}
      css={css`
        width: 100%;
        word-break: break-word;
        font-weight: ${euiThemeVars.euiFontWeightRegular};
      `}
      data-test-subj={dataTestSubj || 'lns-dimensionTrigger'}
    >
      <EuiFlexItem grow={true}>
        <span>
          <span
            className="dimensionTrigger__textLabel"
            css={css`
              transition: background-color ${euiThemeVars.euiAnimSpeedFast} ease-in-out;

              &:hover {
                text-decoration: underline;
              }
            `}
          >
            {safeLabel}
          </span>
        </span>
      </EuiFlexItem>
    </EuiText>
  );
};
