/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DiscoverGridImplementationSwitchProps {
  usesUnifiedDataTable: boolean;
  onSwitch: () => void;
}

export const DiscoverGridImplementationSwitch: React.FC<DiscoverGridImplementationSwitchProps> = ({
  usesUnifiedDataTable,
  onSwitch,
}) => (
  <>
    <EuiHorizontalRule margin="s" />
    <EuiButtonEmpty
      size="xs"
      iconType="sortable"
      onClick={onSwitch}
      data-test-subj="discoverGridImplementationSwitch"
    >
      {usesUnifiedDataTable
        ? i18n.translate('discover.grid.switchToTanStackGrid', {
            defaultMessage: 'Use TanStack grid',
          })
        : i18n.translate('discover.grid.switchToClassicDataGrid', {
            defaultMessage: 'Use classic data grid',
          })}
    </EuiButtonEmpty>
  </>
);
