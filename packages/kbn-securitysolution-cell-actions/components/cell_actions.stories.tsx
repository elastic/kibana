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

const makeActions = (actionsName: string, icon: string) => ({
  id: actionsName,
  type: actionsName,
  getIconType: () => icon,
  getDisplayName: () => actionsName,
  getDisplayNameTooltip: () => actionsName,
  isCompatible: () => Promise.resolve(true),
  execute: () => {
    alert(actionsName);
    return Promise.resolve();
  },
});

const TRIGGER_ID = 'testTriggerId';

const CONFIG = { field: 'name', value: '123', fieldType: 'text' };

export default {
  title: 'CellAction',
  decorators: [
    (storyFn: Function) => (
      <CellActionsContextProvider
        // call uiActions getTriggerCompatibleActions(triggerId, data)
        getCompatibleActions={() => [
          makeActions('Filter in', 'plusInCircle'),
          makeActions('Filter out', 'minusInCircle'),
          makeActions('Minimize', 'minimize'),
          makeActions('Send email', 'email'),
          makeActions('Pin field', 'pin'),
        ]}
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
    options: [CellActionsMode.HOVER_POPUP, CellActionsMode.HOVER_INLINE, CellActionsMode.INLINE],
    defaultValue: CellActionsMode.HOVER_POPUP,
    control: {
      type: 'radio',
    },
  },
};

DefaultWithControls.args = {
  showTooltip: true,
  mode: CellActionsMode.INLINE,
  triggerId: TRIGGER_ID,
  config: CONFIG,
  showMoreActionsFrom: 3,
};

export const CellActionInline = ({}: {}) => (
  <CellActions mode={CellActionsMode.INLINE} triggerId={TRIGGER_ID} config={CONFIG}>
    Field value
  </CellActions>
);

export const CellActionHoverPopup = ({}: {}) => (
  <CellActions mode={CellActionsMode.HOVER_POPUP} triggerId={TRIGGER_ID} config={CONFIG}>
    Hover me
  </CellActions>
);

export const CellActionHoverInline = ({}: {}) => (
  <CellActions mode={CellActionsMode.HOVER_INLINE} triggerId={TRIGGER_ID} config={CONFIG}>
    Hover me
  </CellActions>
);
