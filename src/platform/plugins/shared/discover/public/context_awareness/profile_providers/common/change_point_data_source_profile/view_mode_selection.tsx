/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ChangePointViewMode = 'heatmap' | 'multiple-line' | 'burst-detection';

export interface ViewModeSelectionProps {
  value: ChangePointViewMode;
  onChange: (value: ChangePointViewMode) => void;
}

export const ViewModeSelection: React.FC<ViewModeSelectionProps> = ({ value, onChange }) => (
  <EuiFlexItem grow={false}>
    <EuiSelect
      compressed
      value={value}
      onChange={(e) => onChange(e.target.value as ChangePointViewMode)}
      aria-label={i18n.translate('discover.contextAwareness.changePointExperience.viewModeLabel', {
        defaultMessage: 'Chart view mode',
      })}
      options={[
        {
          value: 'heatmap',
          text: i18n.translate('discover.contextAwareness.changePointExperience.viewHeatmap', {
            defaultMessage: 'Heatmap',
          }),
        },
        {
          value: 'multiple-line',
          text: i18n.translate(
            'discover.contextAwareness.changePointExperience.viewMultipleLineCharts',
            { defaultMessage: 'Multiple line charts' }
          ),
        },
        {
          value: 'burst-detection',
          text: i18n.translate(
            'discover.contextAwareness.changePointExperience.viewBurstDetection',
            { defaultMessage: 'Burst Detection Histogram' }
          ),
        },
      ]}
      data-test-subj="changePointViewModeSelect"
    />
  </EuiFlexItem>
);
