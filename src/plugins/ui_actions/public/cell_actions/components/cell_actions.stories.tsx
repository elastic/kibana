/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { CellActionsContextProvider } from './cell_actions_context';
import { makeAction } from '../mocks/helpers';
import { CellActions, CellActionsMode, CellActionsProps } from './cell_actions';

const TRIGGER_ID = 'testTriggerId';

const FIELD = { name: 'name', value: '123', type: 'text' };

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
        getTriggerCompatibleActions={getCompatibleActions}
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
  showActionTooltips: true,
  mode: CellActionsMode.ALWAYS_VISIBLE,
  triggerId: TRIGGER_ID,
  field: FIELD,
  visibleCellActions: 3,
};

export const CellActionInline = ({}: {}) => (
  <CellActions mode={CellActionsMode.ALWAYS_VISIBLE} triggerId={TRIGGER_ID} field={FIELD}>
    Field value
  </CellActions>
);

export const CellActionHoverPopup = ({}: {}) => (
  <CellActions mode={CellActionsMode.HOVER_POPOVER} triggerId={TRIGGER_ID} field={FIELD}>
    Hover me
  </CellActions>
);
