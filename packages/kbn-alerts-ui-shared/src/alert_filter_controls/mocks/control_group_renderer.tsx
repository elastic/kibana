/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AwaitingControlGroupAPI,
  ControlGroupContainer,
  ControlGroupInputBuilder,
  ControlGroupRendererProps,
} from '@kbn/controls-plugin/public';
import React, { useState, forwardRef, useEffect, useImperativeHandle } from 'react';
import { TEST_IDS } from '../constants';
import { getControlGroupMock } from './control_group';

export const getMockedControlGroupRenderer = (
  controlGroupContainerMock: ControlGroupContainer | undefined
) => {
  const controlGroupMock = controlGroupContainerMock ?? getControlGroupMock();

  const MockedControlGroupRenderer = forwardRef<AwaitingControlGroupAPI, ControlGroupRendererProps>(
    ({ getCreationOptions }, ref) => {
      useImperativeHandle(ref, () => controlGroupMock as unknown as ControlGroupContainer, []);
      const [creationOptionsCalled, setCreationOptionsCalled] = useState(false);

      useEffect(() => {
        if (creationOptionsCalled) return;
        setCreationOptionsCalled(true);
        if (getCreationOptions) {
          getCreationOptions({}, {
            addOptionsListControl: controlGroupMock.addOptionsListControl,
          } as unknown as ControlGroupInputBuilder);
        }
      }, [getCreationOptions, creationOptionsCalled]);
      return <div data-test-subj={TEST_IDS.MOCKED_CONTROL} />;
    }
  );

  MockedControlGroupRenderer.displayName = 'MockedControlGroup';
  return MockedControlGroupRenderer;
};
