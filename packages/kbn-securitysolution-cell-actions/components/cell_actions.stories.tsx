/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { CellActions, CellActionsMode, CellActionsProps } from '.';
import { CellActionsContextProvider } from './cell_actions_context';
import { makeAction } from '../mocks/helpers';

const TRIGGER_ID = 'testTriggerId';

const CONFIG = { field: 'name', value: '123', fieldType: 'text' };

const getCompatibleActions = () =>
  Promise.resolve([
    makeAction('Filter in', 'plusInCircle', 2),
    makeAction('Filter out', 'minusInCircle', 3),
    makeAction('Minimize', 'minimize', 1),
    makeAction('Send email', 'email', 4),
    makeAction('Pin field', 'pin', 5),
  ]);

export default {
  title: 'CellAction',
  decorators: [
    (storyFn: Function) => (
      <CellActionsContextProvider
        // call uiActions getTriggerCompatibleActions(triggerId, data)
        getCompatibleActions={getCompatibleActions}
      >
        <div style={{ paddingTop: '70px' }} />
        {storyFn()}
      </CellActionsContextProvider>
    ),
  ],
};

const CellActionsTemplate: ComponentStory<React.FC<CellActionsProps>> = (args) => (
  <CellActions {...args}>Field value</CellActions>
);

export const DefaultWithControls = CellActionsTemplate.bind({});

DefaultWithControls.argTypes = {
  mode: {
    options: [CellActionsMode.HOVER_POPOVER, CellActionsMode.ALWAYS_VISIBLE],
    defaultValue: CellActionsMode.HOVER_POPOVER,
    control: {
      type: 'radio',
    },
  },
};

DefaultWithControls.args = {
  showTooltip: true,
  mode: CellActionsMode.ALWAYS_VISIBLE,
  triggerId: TRIGGER_ID,
  config: CONFIG,
  showMoreActionsFrom: 3,
};

export const CellActionInline = ({}: {}) => (
  <CellActions mode={CellActionsMode.ALWAYS_VISIBLE} triggerId={TRIGGER_ID} config={CONFIG}>
    Field value
  </CellActions>
);

export const CellActionHoverPopup = ({}: {}) => (
  <CellActions mode={CellActionsMode.HOVER_POPOVER} triggerId={TRIGGER_ID} config={CONFIG}>
    Hover me
  </CellActions>
);
