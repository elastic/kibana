/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { useDrilldownsManager } from '../context';
import { DrilldownForm } from '../../components/drilldown_form';
import type { DrilldownManager } from '../../state';
import type { TriggerPickerProps } from '../../components/trigger_picker';
import { txtDeleteDrilldownButtonLabel } from './i18n';

export interface EditDrilldownFormProps {
  drilldown: DrilldownManager;
}

export const EditDrilldownForm: React.FC<EditDrilldownFormProps> = ({ drilldown }) => {
  const drilldowns = useDrilldownsManager();
  const state = drilldown.useState();
  const triggerPickerProps: TriggerPickerProps = React.useMemo(
    () => ({
      items: drilldown.uiTriggers.map((id) => {
        return drilldowns.deps.getTrigger(id);
      }),
      selected: state.trigger,
      onChange: drilldown.setTrigger,
    }),
    [drilldowns, state.trigger, drilldown]
  );

  return (
    <>
      <DrilldownForm
        name={state.label}
        onNameChange={drilldown.setLabel}
        triggers={triggerPickerProps}
      >
        <drilldown.factory.Editor
          context={drilldowns.deps.setupContext}
          state={state}
          onChange={drilldown.setState}
        />
      </DrilldownForm>
      <EuiSpacer size={'xl'} />
      <EuiButton
        onClick={() => {
          alert('DELETE!');
        }}
        color={'danger'}
      >
        {txtDeleteDrilldownButtonLabel}
      </EuiButton>
    </>
  );
};
