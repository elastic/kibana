/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { DEFAULT_IGNORE_VALIDATIONS, DEFAULT_USE_GLOBAL_FILTERS } from '@kbn/controls-constants';

import { ControlSettingTooltipLabel } from '../../../control_group/components/control_setting_tooltip_label';
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
    initialState.use_global_filters ?? DEFAULT_USE_GLOBAL_FILTERS
  );
  const [ignoreValidations, setIgnoreValidations] = useState<boolean>(
    initialState.ignore_validations ?? DEFAULT_IGNORE_VALIDATIONS
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
            updateState({ use_global_filters: newUseGlobalFilters });
          }}
          data-test-subj={'dataControl__useGlobalFiltersAdditionalSetting'}
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          label={
            <ControlSettingTooltipLabel
              label={DataControlEditorStrings.manageControl.getIgnoreValidationsTitle()}
              tooltip={DataControlEditorStrings.manageControl.getIgnoreValidationsTooltip()}
            />
          }
          checked={!ignoreValidations}
          onChange={() => {
            const newIgnoreValidations = !ignoreValidations;
            setIgnoreValidations(newIgnoreValidations);
            updateState({ ignore_validations: newIgnoreValidations });
          }}
          data-test-subj={'dataControl__ignoreValidationsAdditionalSetting'}
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
