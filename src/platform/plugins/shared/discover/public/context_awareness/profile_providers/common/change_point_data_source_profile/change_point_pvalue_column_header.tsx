/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { UnifiedDataTableSummaryColumnHeader } from '@kbn/unified-data-table';

const TOOLTIP_TITLE = i18n.translate(
  'discover.contextAwareness.changePointPvalueColumnHeader.tooltipTitle',
  { defaultMessage: 'pvalue' }
);

const TOOLTIP_CONTENT = i18n.translate(
  'discover.contextAwareness.changePointPvalueColumnHeader.tooltipContent',
  {
    defaultMessage:
      'Statistical significance of the change point. Lower values indicate a more significant change. Impact levels: high (< 0.0001), moderate (< 0.005), minimal (< 0.03).',
  }
);

interface ChangePointPvalueColumnHeaderProps {
  columnDisplayName?: string;
  headerRowHeight?: number;
}

export const ChangePointPvalueColumnHeader: React.FC<ChangePointPvalueColumnHeaderProps> = ({
  columnDisplayName,
  headerRowHeight,
}) => (
  <UnifiedDataTableSummaryColumnHeader
    columnDisplayName={columnDisplayName ?? 'pvalue'}
    headerRowHeight={headerRowHeight}
    tooltipTitle={TOOLTIP_TITLE}
    tooltipContent={TOOLTIP_CONTENT}
    iconTipDataTestSubj="change-point-pvalue-header-icon"
  />
);
