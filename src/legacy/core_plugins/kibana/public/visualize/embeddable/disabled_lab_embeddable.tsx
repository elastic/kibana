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
import { Embeddable } from 'plugins/embeddable_api/index';
import { I18nContext } from 'ui/i18n';
import { DisabledLabVisualization } from './disabled_lab_visualization';
import { VisualizeInput, VisualizeOutput } from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './visualize_embeddable_factory';

export class DisabledLabEmbeddable extends Embeddable<VisualizeInput, VisualizeOutput> {
  private domNode?: HTMLElement;

  constructor(private readonly title: string, initialInput: VisualizeInput) {
    super({ type: VISUALIZE_EMBEDDABLE_TYPE, id: '' }, { title, editUrl: '' }, initialInput);
  }

  public render(domNode: HTMLElement) {
    if (this.title) {
      this.domNode = domNode;
      ReactDOM.render(
        <I18nContext>
          <DisabledLabVisualization title={this.title} />
        </I18nContext>,
        domNode
      );
    }
  }

  public destroy() {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
  }
}
