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

import { Embeddable } from '../embeddables';

export class Container<S> {
  private state: S;

  private readonly embeddables: { [key: string]: Embeddable<S, any> } = {};

  constructor({ initialState }: { initialState: S }) {
    this.state = initialState;
  }

  public getState(): Readonly<S> {
    return this.state;
  }

  public addEmbeddable(embeddable: Embeddable<S, any>) {
    this.embeddables[embeddable.id] = embeddable;
    embeddable.onContainerStateChanged(this.state);
  }

  public removeEmbeddable(embeddable: Embeddable<S, any>) {
    this.embeddables[embeddable.id].destroy();
    delete this.embeddables[embeddable.id];
  }

  public getEmbeddable(id: string) {
    return this.embeddables[id];
  }

  public onStateChange(newState: S) {
    this.state = newState;
    Object.values(this.embeddables).forEach((embeddable: Embeddable<S, any>) => {
      embeddable.onContainerStateChanged(this.state);
    });
  }
}
