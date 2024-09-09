/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { CustomGridColumnProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import {
  contentHeaderTooltipParagraph1,
  contentHeaderTooltipParagraph2,
  contentLabel,
} from '../../../../data_types/logs/translations';
import * as constants from '../../../../../../common/data_types/logs/constants';
import { TooltipButton } from './tooltip_button';
import { FieldWithToken } from './field_with_token';

export const ContentColumnTooltip = ({ column, headerRowHeight }: CustomGridColumnProps) => {
  const { euiTheme } = useEuiTheme();
  const spacingCSS = css`
    margin-bottom: ${euiTheme.size.s};
  `;

  return (
    <TooltipButton
      displayText={column.displayAsText}
      headerRowHeight={headerRowHeight}
      popoverTitle={contentLabel}
    >
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{contentHeaderTooltipParagraph1}</p>
        </EuiText>
        <EuiText size="s" css={spacingCSS}>
          <p>{contentHeaderTooltipParagraph2}</p>
        </EuiText>
        <FieldWithToken field={constants.ERROR_MESSAGE_FIELD} />
        <FieldWithToken field={constants.EVENT_ORIGINAL_FIELD} iconType="tokenEvent" />
      </div>
    </TooltipButton>
  );
};
