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
import { Embeddable } from 'ui/embeddable';
import { I18nContext } from 'ui/i18n';
import { DisabledLabVisualization } from './disabled_lab_visualization';

export class DisabledLabEmbeddable extends Embeddable {
  private domNode?: HTMLElement;

  constructor(title: string) {
    super({ title });
  }

  public render(domNode: HTMLElement) {
    if (this.metadata.title) {
      this.domNode = domNode;
      ReactDOM.render(
        <I18nContext>
          <DisabledLabVisualization title={this.metadata.title} />
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
