/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, type FC } from 'react';

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const Options: FC = () => {
  const state = useEventBusExampleState();

  const [toggleIdToSelectedMap, setToggleIdToSelectedMap] = useState<Record<string, boolean>>({});

  const toggleButtonsMulti = [
    {
      id: 'aiops',
      label: 'AIOps',
    },
    {
      id: 'genai',
      label: 'GenAI',
    },
  ];

  const onChangeMulti = (optionId: string) => {
    const newToggleIdToSelectedMap = {
      ...toggleIdToSelectedMap,
      ...{
        [optionId]: !toggleIdToSelectedMap[optionId],
      },
    };
    setToggleIdToSelectedMap(newToggleIdToSelectedMap);
  };

  useEffect(() => {
    state.actions.setAiopsEnabled(!!toggleIdToSelectedMap.aiops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleIdToSelectedMap]);

  return (
    <>
      <EuiButtonGroup
        legend="This is a primary group"
        options={toggleButtonsMulti}
        idToSelectedMap={toggleIdToSelectedMap}
        onChange={(id) => onChangeMulti(id)}
        color="primary"
        type="multi"
      />
      <EuiSpacer size="s" />
    </>
  );
};
