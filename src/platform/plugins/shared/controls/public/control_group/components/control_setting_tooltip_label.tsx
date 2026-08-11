/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const rowStyles = css({ marginTop: '0px !important' });

export const ControlSettingTooltipLabel = ({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} aria-label={label}>
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false} css={rowStyles}>
      <EuiIconTip
        content={tooltip}
        position="right"
        aria-label={i18n.translate(
          'controls.controlGroup.controlSettingTooltipLabel.tooltipAriaLabel',
          {
            defaultMessage: 'More about {label}',
            values: {
              label,
            },
          }
        )}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
