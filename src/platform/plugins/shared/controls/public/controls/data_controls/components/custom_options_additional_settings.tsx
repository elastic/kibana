/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import React, { useState } from 'react';
import { DataControlEditorStrings } from '../data_control_constants';
import type { CustomOptionsComponentProps } from '../types';

type Props = React.PropsWithChildren<
  Pick<CustomOptionsComponentProps, 'initialState' | 'updateState'>
>;

export const CustomOptionsAdditionalSettings: React.FC<Props> = ({
  children,
  initialState,
  updateState,
}) => {
  const [useGlobalFilters, setUseGlobalFilters] = useState<boolean>(
    initialState.useGlobalFilters ?? true
  );
  return (
    <EuiFormRow label={DataControlEditorStrings.manageControl.getAdditionalSettingsTitle()}>
      <>
        <EuiSwitch
          compressed
          label={DataControlEditorStrings.manageControl.getUseGlobalFiltersTitle()}
          checked={useGlobalFilters}
          onChange={() => {
            const newUseGlobalFilters = !useGlobalFilters;
            setUseGlobalFilters(newUseGlobalFilters);
            updateState({ useGlobalFilters: newUseGlobalFilters });
          }}
          data-test-subj={'optionsListControl__useGlobalFiltersAdditionalSetting'}
        />
        {children ? (
          <>
            <EuiSpacer size="s" />
            {children}
          </>
        ) : null}
      </>
    </EuiFormRow>
  );
};
