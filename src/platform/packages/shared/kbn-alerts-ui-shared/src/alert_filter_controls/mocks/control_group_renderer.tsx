/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ControlGroupRendererApi,
  type ControlGroupRendererProps,
  type ControlGroupStateBuilder,
} from '@kbn/controls-plugin/public';
import React, { useEffect, useState } from 'react';
import { TEST_IDS } from '../constants';
import { getControlGroupMock } from './control_group';

export const addOptionsListControlMock = jest
  .fn()
  .mockImplementation((initialState, controlState, id) => {
    if (!initialState.initialChildControlState) {
      initialState.initialChildControlState = {};
    }
    initialState.initialChildControlState[id] = controlState;
  });

export const getMockedControlGroupRenderer = (
  controlGroupApiMock: ControlGroupRendererApi | undefined
) => {
  const controlGroupMock = controlGroupApiMock ?? getControlGroupMock();

  const MockedControlGroupRenderer = ({
    onApiAvailable,
    getCreationOptions,
  }: ControlGroupRendererProps) => {
    const [creationOptionsCalled, setCreationOptionsCalled] = useState(false);

    useEffect(() => {
      if (creationOptionsCalled) return;
      setCreationOptionsCalled(true);
      if (getCreationOptions) {
        getCreationOptions({}, {
          addOptionsListControl: addOptionsListControlMock,
        } as unknown as ControlGroupStateBuilder);
      }
    }, [getCreationOptions, creationOptionsCalled]);

    useEffect(() => {
      onApiAvailable(controlGroupMock as unknown as ControlGroupRendererApi);
    }, [onApiAvailable]);

    return <div data-test-subj={TEST_IDS.MOCKED_CONTROL} />;
  };

  MockedControlGroupRenderer.displayName = 'MockedControlGroup';
  return MockedControlGroupRenderer;
};
