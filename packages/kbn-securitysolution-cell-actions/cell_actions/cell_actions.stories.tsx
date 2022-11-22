/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf, addDecorator } from '@storybook/react';
import type { Action } from '@kbn/ui-actions-plugin/public';

import { CellActionsContextProvider, CellActions } from '..';

const filterInTestAction: Action = {
  id: 'filterInTestAction',
  type: 'filter in',
  getIconType: () => 'plusInCircle',
  getDisplayName: () => 'Filter in',
  isCompatible: () => Promise.resolve(true),
  execute: () => Promise.resolve(),
};

const filterOutTestAction: Action = {
  id: 'filterOutTestAction',
  type: 'filter out',
  getIconType: () => 'minusInCircle',
  getDisplayName: () => 'Filter out',
  isCompatible: () => Promise.resolve(true),
  execute: () => Promise.resolve(),
};

const TRIGGER_ID = 'testTriggerId';

addDecorator((storyFn) => (
  <CellActionsContextProvider
    getActions={(trigger: string) => [filterInTestAction, filterOutTestAction]}
  >
    {storyFn()}
  </CellActionsContextProvider>
));

storiesOf('CellAction', module).add('default', () => (
  <CellActions triggerId={TRIGGER_ID} getActionContext={() => ({ trigger: { id: TRIGGER_ID } })} />
));
