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
import { Chart, getSpecId, ScaleType, SpecTypes, BarSeries, ChartTypes } from '@elastic/charts';
import ReactDOM from 'react-dom';
import React from 'react';
import { Embeddable, EmbeddableInput, IContainer } from '../../../../src/plugins/embeddable/public';

export const HELLO_WORLD_EMBEDDABLE = 'HELLO_WORLD_EMBEDDABLE';

export class HelloWorldEmbeddable extends Embeddable {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = HELLO_WORLD_EMBEDDABLE;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(
      // Input state is irrelevant to this embeddable, just pass it along.
      initialInput,
      // Initial output state - this embeddable does not do anything with output, so just
      // pass along an empty object.
      {},
      // Optional parent component, this embeddable can optionally be rendered inside a container.
      parent
    );
  }

  SPEC_ID = 'bars';
  GROUP_ID = 'group_1';

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    const data = [
      { x: 0, y: 2 },
      { x: 1, y: 7 },
      { x: 2, y: 3 },
      { x: 3, y: 6 },
    ];
    ReactDOM.render(
      <div style={{ width: 100 + '%', height: 200 + 'px' }}>
        <Chart>
          <BarSeries
            id={getSpecId('bars')}
            name={'Simple bar series'}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={data}
          />
        </Chart>
      </div>,
      node
    );

    // node.innerHTML = '<div data-test-subj="helloWorldEmbeddable">HELLO WORLD!</div>';
  }

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
   */
  public reload() {}
}
