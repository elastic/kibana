/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface EndzoneTooltipHeaderProps {
  value?: string;
}

export const EndzoneTooltipHeader: FC<EndzoneTooltipHeaderProps> = ({ value }) => (
  <>
    <EuiFlexGroup
      alignItems="center"
      className="detailedTooltip__header--partial"
      responsive={false}
      gutterSize="xs"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="iInCircle" />
      </EuiFlexItem>
      <EuiFlexItem>
        {i18n.translate('expressionXY.partialData.bucketTooltipText', {
          defaultMessage:
            'The selected time range does not include this entire bucket. It might contain partial data.',
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
    {value !== undefined && (
      <>
        <EuiSpacer size="xs" />
        <p>{value}</p>
      </>
    )}
  </>
);
