/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useDrilldownsManager } from '../context';
import { DrilldownForm } from '../../components/drilldown_form';
import type { DrilldownManager } from '../../state';
import type { TriggerPickerProps } from '../../components/trigger_picker';

export interface DrilldownStateFormProps {
  drilldown: DrilldownManager;
  disabled?: boolean;
}

export const DrilldownStateForm: React.FC<DrilldownStateFormProps> = ({ drilldown, disabled }) => {
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
  // const context = drilldown.getFactoryContext();

  return (
    <DrilldownForm
      name={name}
      onNameChange={drilldown.setName}
      triggers={triggerPickerProps}
      disabled={disabled}
    >
      <drilldown.factory.Editor
        state={config}
        onChange={disabled ? () => {} : drilldown.setConfig}
      />
    </DrilldownForm>
  );
};
