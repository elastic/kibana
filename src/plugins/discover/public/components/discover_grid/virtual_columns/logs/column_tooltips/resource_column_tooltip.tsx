/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { CustomGridColumnProps } from '@kbn/unified-data-table';
import React from 'react';
import * as constants from '../../../../../../common/data_types/logs/constants';
import {
  resourceHeaderTooltipParagraph,
  resourceLabel,
} from '../../../../data_types/logs/translations';
import { FieldWithToken } from './field_with_token';
import { TooltipButton } from './tooltip_button';

const spacingCSS = css`
  margin-bottom: ${euiThemeVars.euiSizeS};
`;

export const ResourceColumnTooltip = ({ column, headerRowHeight }: CustomGridColumnProps) => {
  return (
    <TooltipButton
      displayText={column.displayAsText}
      headerRowHeight={headerRowHeight}
      popoverTitle={resourceLabel}
    >
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{resourceHeaderTooltipParagraph}</p>
        </EuiText>
        {[
          constants.SERVICE_NAME_FIELD,
          constants.CONTAINER_NAME_FIELD,
          constants.ORCHESTRATOR_NAMESPACE_FIELD,
          constants.HOST_NAME_FIELD,
          constants.CLOUD_INSTANCE_ID_FIELD,
        ].map((field) => (
          <FieldWithToken field={field} key={field} />
        ))}
      </div>
    </TooltipButton>
  );
};
