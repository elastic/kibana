/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCheckableCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormFieldset,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  hidePrimaryLabels: boolean;
  onChange: (hidePrimaryLabels: boolean) => void;
}

export const PrimaryNavLabelsSelector = ({ hidePrimaryLabels, onChange }: Props) => {
  const radioGroupName = useGeneratedHtmlId({ prefix: 'primaryNavLabelsSelector' });
  const showLabelsId = useGeneratedHtmlId({ prefix: 'primaryNavLabelsShow' });
  const hideLabelsId = useGeneratedHtmlId({ prefix: 'primaryNavLabelsHide' });
  const legend = i18n.translate('navigationCustomizationComponents.primaryNavLabelsLegend', {
    defaultMessage: 'Primary navigation labels',
  });
  const showLabelsLabel = i18n.translate('navigationCustomizationComponents.showLabelsLabel', {
    defaultMessage: 'Icons and text',
  });
  const hideLabelsLabel = i18n.translate('navigationCustomizationComponents.hideLabelsLabel', {
    defaultMessage: 'Icons only',
  });

  return (
    <EuiFormFieldset
      legend={{
        children: legend,
        display: 'hidden',
      }}
      data-test-subj="primaryNavLabelsSelector"
    >
      <EuiFlexGrid columns={2} gutterSize="s">
        <EuiFlexItem data-test-subj="primaryNavLabelsShow">
          <EuiCheckableCard
            id={showLabelsId}
            name={radioGroupName}
            checkableType="radio"
            label={showLabelsLabel}
            checked={!hidePrimaryLabels}
            onChange={() => onChange(false)}
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="primaryNavLabelsHide">
          <EuiCheckableCard
            id={hideLabelsId}
            name={radioGroupName}
            checkableType="radio"
            label={hideLabelsLabel}
            checked={hidePrimaryLabels}
            onChange={() => onChange(true)}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFormFieldset>
  );
};
