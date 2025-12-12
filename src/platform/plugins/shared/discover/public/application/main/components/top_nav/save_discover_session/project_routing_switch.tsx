/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ProjectRoutingSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ProjectRoutingSwitch: React.FC<ProjectRoutingSwitchProps> = ({
  checked,
  onChange,
}) => {
  return (
    <EuiFormRow fullWidth>
      <EuiSwitch
        data-test-subj="storeProjectRoutingWithSearch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        label={
          <FormattedMessage
            id="discover.topNav.saveModal.storeProjectRoutingWithSearchToggleLabel"
            defaultMessage="Include cross-project search scope customizations"
          />
        }
      />
    </EuiFormRow>
  );
};
