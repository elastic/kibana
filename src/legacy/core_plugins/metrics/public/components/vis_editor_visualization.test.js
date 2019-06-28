/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/visualize/loader/visualize_loader', () => ({}));

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { VisEditorVisualization } from './vis_editor_visualization';

describe('getVisualizeLoader', () => {
  let updateStub;

  beforeEach(() => {
    updateStub = jest.fn();
    const handlerMock = {
      update: updateStub,
      data$: {
        subscribe: () => {},
      },
    };
    const loaderMock = {
      embedVisualizationWithSavedObject: () => handlerMock,
    };
    require('ui/visualize/loader/visualize_loader').getVisualizeLoader = async () => loaderMock;
  });

  it('should not call _handler.update until getVisualizeLoader returns _handler', async () => {
    const wrapper = mountWithIntl(<VisEditorVisualization />);

    // Set prop to force DOM change and componentDidUpdate to be triggered
    wrapper.setProps({
      timeRange: {
        from: '2019-03-20T20:35:37.637Z',
        to: '2019-03-23T18:40:16.486Z',
      },
    });

    expect(updateStub).not.toHaveBeenCalled();

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));

    // Set prop to force DOM change and componentDidUpdate to be triggered
    wrapper.setProps({
      timeRange: {
        from: 'now/d',
        to: 'now/d',
      },
    });

    expect(updateStub).toHaveBeenCalled();
  });
});
