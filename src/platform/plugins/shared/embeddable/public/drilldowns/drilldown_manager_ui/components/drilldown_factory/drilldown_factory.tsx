/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

const txtDrilldownAction = i18n.translate(
  'embeddableApi.components.DrilldownForm.drilldownAction',
  {
    defaultMessage: 'Action',
  }
);

const txtChangeButton = i18n.translate('embeddableApi.components.DrilldownForm.changeButton', {
  defaultMessage: 'Change',
});

interface Props {
  name?: string;
  icon?: string;
  /** On drilldown type change click. */
  onChange?: () => void;
}

export const DrilldownFactory: React.FC<Props> = ({ name, icon, onChange }) => {
  return (
    <EuiFormRow label={txtDrilldownAction} fullWidth={true}>
      <header>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          {!!icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>{name} </h4>
            </EuiText>
          </EuiFlexItem>
          {!!onChange && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" data-test-subj="changeDrilldownType" onClick={onChange}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
    </EuiFormRow>
  );
};
