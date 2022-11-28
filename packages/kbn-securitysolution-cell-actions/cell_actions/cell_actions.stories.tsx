/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
// FIXME can't import plugins from package
import type { Action } from '@kbn/ui-actions-plugin/public';

import { CellActionsContextProvider, CellActions, CellActionsMode, CellActionsProps } from '..';

const filterInTestAction: Action = {
  id: 'filterInTestAction',
  type: 'filter in',
  getIconType: () => 'plusInCircle',
  getDisplayName: () => 'Filter in',
  getDisplayNameTooltip: () => 'Filter in',
  isCompatible: () => Promise.resolve(true),
  execute: () => {
    alert('Filter in clicked');
    return Promise.resolve();
  },
};

const filterOutTestAction: Action = {
  id: 'filterOutTestAction',
  type: 'filter out',
  getIconType: () => 'minusInCircle',
  getDisplayName: () => 'Filter out',
  getDisplayNameTooltip: () => 'Filter out',
  isCompatible: () => Promise.resolve(true),
  execute: () => {
    alert('Filter out clicked');
    return Promise.resolve();
  },
};

const TRIGGER_ID = 'testTriggerId';

const CONFIG = { field: 'name', value: '123', fieldType: 'text' };

export default {
  title: 'CellAction',
  decorators: [
    (storyFn: Function) => (
      <CellActionsContextProvider
        // call uiActions getTriggerCompatibleActions(triggerId, data)
        getCompatibleActions={() => [
          filterInTestAction,
          filterOutTestAction,
          filterInTestAction,
          filterOutTestAction,
        ]}
      >
        {storyFn()}
      </CellActionsContextProvider>
    ),
  ],
};

const CellActionsTemplate: ComponentStory<React.FC<CellActionsProps>> = (args) => (
  <CellActions {...args}>Field value</CellActions>
);

export const Default = CellActionsTemplate.bind({});

Default.argTypes = {
  mode: {
    options: [CellActionsMode.HOVER_POPUP, CellActionsMode.HOVER_INLINE, CellActionsMode.INLINE],
    defaultValue: CellActionsMode.HOVER_POPUP,
    control: {
      type: 'radio',
    },
  },
};

Default.args = {
  showTooltip: true,
  mode: CellActionsMode.INLINE,
  triggerId: TRIGGER_ID,
  config: CONFIG,
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
