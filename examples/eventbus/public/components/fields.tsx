/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, type FC } from 'react';

import { EuiCheckboxGroup, EuiForm, EuiPanel } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const Fields: FC = () => {
  const state = useEventBusExampleState();
  const data = state.useState((s) => s.allFields);

  const checkboxes = data.map((d) => ({
    id: d,
    label: d,
  }));
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );

  const onCheckboxChange = (optionId: string) => {
    const newCheckboxIdToSelectedMap = {
      ...checkboxIdToSelectedMap,
      ...{
        [optionId]: !checkboxIdToSelectedMap[optionId],
      },
    };

    state.actions.setSelectedFields(
      Object.entries(newCheckboxIdToSelectedMap)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );
    setCheckboxIdToSelectedMap(newCheckboxIdToSelectedMap);
  };

  useEffect(() => {
    if (data.includes('@timestamp')) {
      onCheckboxChange('@timestamp');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiForm>
        <EuiCheckboxGroup
          compressed={true}
          options={checkboxes}
          idToSelectedMap={checkboxIdToSelectedMap}
          onChange={onCheckboxChange}
          legend={{
            children: 'Available fields',
          }}
        />
      </EuiForm>
    </EuiPanel>
  );
};
