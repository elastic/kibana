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

import expect from '@kbn/expect';
import { createPanelState } from '../panel_state';

function createPanelWithDimensions(x: number, y: number, w: number, h: number): PanelState {
  return {
    id: 'foo',
    version: '6.3.0',
    type: 'bar',
    panelIndex: 'test',
    title: 'test title',
    gridData: {
      x,
      y,
      w,
      h,
      i: 'an id',
    },
    embeddableConfig: {},
  };
}

describe('Panel state', () => {
  it('finds a spot on the right', () => {
    // Default setup after a single panel, of default size, is on the grid
    const panels = [createPanelWithDimensions(0, 0, 24, 30)];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(24);
    expect(panel.gridData.y).to.equal(0);
  });

  it('finds a spot on the right when the panel is taller than any other panel on the grid', () => {
    // Should be a little empty spot on the right.
    const panels = [
      createPanelWithDimensions(0, 0, 24, 45),
      createPanelWithDimensions(24, 0, 24, 30),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(24);
    expect(panel.gridData.y).to.equal(30);
  });

  it('finds an empty spot in the middle of the grid', () => {
    const panels = [
      createPanelWithDimensions(0, 0, 48, 5),
      createPanelWithDimensions(0, 5, 4, 30),
      createPanelWithDimensions(40, 5, 4, 30),
      createPanelWithDimensions(0, 55, 48, 5),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(4);
    expect(panel.gridData.y).to.equal(5);
  });
});
