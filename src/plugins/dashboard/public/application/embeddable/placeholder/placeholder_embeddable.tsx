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

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';
import { Embeddable, EmbeddableInput, IContainer } from '../../../embeddable_plugin';

export const PLACEHOLDER_EMBEDDABLE = 'placeholder';

export class PlaceholderEmbeddable extends Embeddable {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = PLACEHOLDER_EMBEDDABLE;
  private node?: HTMLElement;

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

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const classes = classNames('embPanel', 'embPanel-isLoading');
    ReactDOM.render(
      <div className={classes}>
        <EuiLoadingChart size="l" mono />
      </div>,
      node
    );
  }

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
   */
  public reload() {}
}
