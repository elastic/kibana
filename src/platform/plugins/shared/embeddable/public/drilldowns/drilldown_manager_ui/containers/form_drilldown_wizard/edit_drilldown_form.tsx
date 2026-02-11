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
import { i18n } from '@kbn/i18n';
import { useDrilldownsManager } from '../context';
import { DrilldownForm } from '../../components/drilldown_form';
import type { DrilldownManager } from '../../state';
import type { TriggerPickerProps } from '../../components/trigger_picker';

export const txtDeleteDrilldownButtonLabel = i18n.translate(
  'uiActionsEnhanced.drilldowns.components.flyoutDrilldownWizard.deleteDrilldownButtonLabel',
  {
    defaultMessage: 'Delete drilldown',
  }
);

export interface EditDrilldownFormProps {
  drilldown: DrilldownManager;
}

export const EditDrilldownForm: React.FC<EditDrilldownFormProps> = ({ drilldown }) => {
  const drilldowns = useDrilldownsManager();
  const name = drilldown.useName();
  const trigger = drilldown.useTrigger();
  const config = drilldown.useConfig();
  const triggerPickerProps: TriggerPickerProps = React.useMemo(
    () => ({
      items: drilldown.uiTriggers.map((id) => {
        return drilldowns.deps.getTrigger(id);
      }),
      selected: trigger,
      onChange: drilldown.setTrigger,
    }),
    [drilldowns, trigger, drilldown]
  );

  return (
    <>
      <DrilldownForm name={name} onNameChange={drilldown.setName} triggers={triggerPickerProps}>
        <drilldown.factory.Editor
          context={drilldowns.deps.setupContext}
          state={config}
          onChange={drilldown.setConfig}
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
