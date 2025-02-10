/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';

export interface TooltipData {
  label?: string;
  value?: string;
}

export const TooltipRow: FC<TooltipData> = ({ label, value }) => {
  return label && value ? (
    <tr>
      <td className="detailedTooltip__label">
        <div className="detailedTooltip__labelContainer">{label}</div>
      </td>

      <td className="detailedTooltip__value">
        <div className="detailedTooltip__valueContainer">{value}</div>
      </td>
    </tr>
  ) : null;
};
