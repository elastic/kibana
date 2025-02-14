/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentStory } from '@storybook/react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { CellActionsProvider } from '../context/cell_actions_context';
import { makeAction } from '../mocks/helpers';
import { CellActions } from '../components/cell_actions';
import { CellActionsMode } from '../constants';
import type { CellActionsProps } from '../types';

const TRIGGER_ID = 'testTriggerId';

const VALUE = '123';
const FIELD: FieldSpec = {
  name: 'name',
  type: 'text',
  searchable: true,
  aggregatable: true,
};

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
      <CellActionsProvider
        // call uiActions getTriggerCompatibleActions(triggerId, data)
        getTriggerCompatibleActions={getCompatibleActions}
      >
        <div style={{ paddingTop: '70px' }} />
        {storyFn()}
      </CellActionsProvider>
    ),
  ],
};

const CellActionsTemplate: ComponentStory<React.FC<CellActionsProps>> = (args) => (
  <CellActions {...args}>{'Field value'}</CellActions>
);

export const DefaultWithControls = CellActionsTemplate.bind({});

DefaultWithControls.argTypes = {
  mode: {
    options: [CellActionsMode.HOVER_DOWN, CellActionsMode.INLINE],
    defaultValue: CellActionsMode.HOVER_DOWN,
    control: {
      type: 'radio',
    },
  },
};

DefaultWithControls.args = {
  showActionTooltips: true,
  mode: CellActionsMode.INLINE,
  triggerId: TRIGGER_ID,
  data: [
    {
      field: FIELD,
      value: '',
    },
  ],
  visibleCellActions: 3,
};

export const CellActionInline = () => (
  <CellActions
    mode={CellActionsMode.INLINE}
    triggerId={TRIGGER_ID}
    data={[
      {
        field: FIELD,
        value: VALUE,
      },
    ]}
  >
    {'Field value'}
  </CellActions>
);

export const CellActionInlineCustomStyle = () => (
  <CellActions
    mode={CellActionsMode.INLINE}
    triggerId={TRIGGER_ID}
    data={[
      {
        field: FIELD,
        value: VALUE,
      },
    ]}
    extraActionsIconType="boxesVertical"
    extraActionsColor="text"
  >
    {'Field value'}
  </CellActions>
);

export const CellActionHoverPopoverDown = () => (
  <CellActions
    mode={CellActionsMode.HOVER_DOWN}
    triggerId={TRIGGER_ID}
    data={[
      {
        field: FIELD,
        value: VALUE,
      },
    ]}
  >
    {'Hover me'}
  </CellActions>
);

export const CellActionHoverPopoverRight = () => (
  <CellActions
    mode={CellActionsMode.HOVER_RIGHT}
    triggerId={TRIGGER_ID}
    data={[
      {
        field: FIELD,
        value: VALUE,
      },
    ]}
  >
    {'Hover me'}
  </CellActions>
);
