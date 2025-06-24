/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiDataGridCustomToolbarProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import { internalRenderCustomToolbar } from '../custom_toolbar/render_custom_toolbar';

export interface ComparisonToolbarProps {
  additionalControls: ReactElement;
  comparisonFields: string[];
  totalFields: number;
}

export const renderComparisonToolbar = ({
  additionalControls,
  comparisonFields,
  totalFields,
}: ComparisonToolbarProps) => {
  return (toolbarProps: EuiDataGridCustomToolbarProps) => {
    return internalRenderCustomToolbar({
      leftSide: additionalControls,
      toolbarProps,
      gridProps: {},
      bottomSection:
        totalFields > comparisonFields.length ? (
          <EuiCallOut
            size="s"
            iconType="iInCircle"
            title={i18n.translate('unifiedDataTable.comparisonMaxFieldsCallout', {
              defaultMessage:
                'Comparison is limited to {comparisonFields} of {totalFields} fields.',
              values: { comparisonFields: comparisonFields.length, totalFields },
            })}
          />
        ) : undefined,
    });
  };
};
