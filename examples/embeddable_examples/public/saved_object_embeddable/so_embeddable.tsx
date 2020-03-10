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
import { Subscription } from 'rxjs';
import { CoreStart } from 'kibana/public';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
} from '../../../../src/plugins/embeddable/public';
import { SOComponent } from './so_component';

export const SO_EMBEDDABLE = 'SO_EMBEDDABLE';

export interface SOEmbeddableInput extends EmbeddableInput {
  id: string;
  type: string;
}

interface Config {
  input: SOEmbeddableInput;
  parent?: IContainer;
  savedObjectClient: CoreStart['savedObjects']['client'];
}

export class SOEmbeddable extends Embeddable<SOEmbeddableInput, EmbeddableOutput> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = SO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor({ input, parent }: Config) {
    super(input, { references: [{ id: input.id, type: input.type }] }, parent);

    // If you have any output state that changes as a result of input state changes, you
    // should use an subcription.  Here, we use output to indicate whether this task
    // matches the search string.
    this.subscription = this.getInput$().subscribe(async () => {
      this.updateOutput({
        references: [{ id: this.input.id, type: this.input.type }],
      });
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<SOComponent embeddable={this} />, node);
  }

  public replaceReferences(references: Array<{ oldId: string; type: string; newId: string }>) {
    const ref = references.find(
      ({ oldId, type }) => oldId === this.input.id && type === this.input.type
    );
    if (ref) {
      this.updateInput({ id: ref.newId });
    }
  }

  /**
   * Not relevant.
   */
  public reload() {}

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
