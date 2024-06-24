/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { Vis } from '@kbn/visualizations-plugin/public';
import { CONTROL_TYPES } from '../editor_utils';
import { InputControlVisParams } from '../types';
import { addToControls } from './add_to_controls';

describe('addToControls', () => {

  const mockControlGroupApi = {
    addOptionsListControl: jest.fn(),
    addRangeSliderControl: jest.fn(),
  } as unknown as ControlGroupApi;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should add range slider control', () => {
    const vis = {
      params: {
        controls: [
          {
            id: '1234',
            fieldName: 'bytes',
            indexPattern: '90943e30-9a47-11e8-b64d-95841ca0b247',
            label: 'My bytes',
            options: {
              step: 1024
            },
            type: CONTROL_TYPES.RANGE,
          }
        ]
      }
    } as unknown as Vis<InputControlVisParams>;
    addToControls(mockControlGroupApi, vis);
    expect(mockControlGroupApi.addRangeSliderControl.mock.calls).toHaveLength(1);
    expect(mockControlGroupApi.addRangeSliderControl.mock.calls[0][0]).toEqual({
      controlId: '1234',
      dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
      fieldName: 'bytes',
      step: 1024,
      title: 'My bytes'
    });
  });
});