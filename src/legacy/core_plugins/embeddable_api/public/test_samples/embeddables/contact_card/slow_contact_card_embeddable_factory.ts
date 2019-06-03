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

import { Container, EmbeddableFactory } from '../../..';
import { ContactCardEmbeddable, ContactCardEmbeddableInput } from './contact_card_embeddable';

export const CONTACT_CARD_EMBEDDABLE = 'CONTACT_CARD_EMBEDDABLE';

export class SlowContactCardEmbeddableFactory extends EmbeddableFactory<
  ContactCardEmbeddableInput
> {
  private loadTickCount = 0;
  public readonly type = CONTACT_CARD_EMBEDDABLE;

  constructor(options: { loadTickCount?: number } = {}) {
    super();
    if (options.loadTickCount) {
      this.loadTickCount = options.loadTickCount;
    }
  }

  public isEditable() {
    return true;
  }

  public getDisplayName() {
    return 'slow to load contact card';
  }

  public async create(initialInput: ContactCardEmbeddableInput, parent?: Container) {
    for (let i = 0; i < this.loadTickCount; i++) {
      await Promise.resolve();
    }
    return new ContactCardEmbeddable(initialInput, parent);
  }
}
