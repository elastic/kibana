/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import { ControlGroupInput } from './types';
import { getDefaultControlGroupInput } from '..';
import { ControlGroupContainerFactory } from '../../public';

export const mockControlGroupInput = (partial?: Partial<ControlGroupInput>): ControlGroupInput => ({
  id: 'mocked_control_group',
  ...getDefaultControlGroupInput(),
  ...{
    panels: {
      control1: {
        order: 0,
        width: 'medium',
        grow: true,
        type: 'mockedOptionsList',
        explicitInput: {
          id: 'control1',
        },
      },
      control2: {
        order: 1,
        width: 'large',
        grow: true,
        type: 'mockedRangeSlider',
        explicitInput: {
          id: 'control2',
        },
      },
      control3: {
        order: 2,
        width: 'small',
        grow: true,
        type: 'mockedOptionsList',
        explicitInput: {
          id: 'control3',
        },
      },
    },
  },
  ...(partial ?? {}),
});

export const mockControlGroupContainer = async (explicitInput?: Partial<ControlGroupInput>) => {
  const controlGroupFactoryStub = new ControlGroupContainerFactory(
    {} as unknown as EmbeddablePersistableStateService
  );
  const controlGroupContainer = await controlGroupFactoryStub.create({
    id: 'mocked-control-group',
    ...getDefaultControlGroupInput(),
    ...explicitInput,
  });

  return controlGroupContainer;
};
