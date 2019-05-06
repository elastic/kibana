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

import { EmbeddableFactory } from 'plugins/embeddable_api/index';
import { Container } from 'plugins/embeddable_api/containers';
import { GreetingEmbeddable, GreetingEmbeddableInput } from './greeting_embeddable';

export const GREETING_EMBEDDABLE = 'GREETING_EMBEDDABLE';

export class SlowGreetingEmbeddableFactory extends EmbeddableFactory<GreetingEmbeddableInput> {
  private loadTickCount = 0;
  constructor(options: { loadTickCount?: number } = {}) {
    super({
      name: GREETING_EMBEDDABLE,
    });
    if (options.loadTickCount) {
      this.loadTickCount = options.loadTickCount;
    }
  }

  public isEditable() {
    return true;
  }

  public getDisplayName() {
    return 'slow to load greeting';
  }

  public async create(initialInput: GreetingEmbeddableInput, parent?: Container) {
    for (let i = 0; i < this.loadTickCount; i++) {
      await Promise.resolve();
    }
    return Promise.resolve(new GreetingEmbeddable(initialInput, parent));
  }
}
