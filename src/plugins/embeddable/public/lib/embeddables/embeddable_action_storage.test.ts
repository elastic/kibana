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

import { Embeddable } from './embeddable';
import { EmbeddableInput } from './i_embeddable';
import { ViewMode } from '../types';
import { EmbeddableActionStorage, SerializedEvent } from './embeddable_action_storage';
import { of } from '../../../../kibana_utils/common';

class TestEmbeddable extends Embeddable<EmbeddableInput> {
  public readonly type = 'test';
  constructor() {
    super({ id: 'test', viewMode: ViewMode.VIEW }, {});
  }
  reload() {}
}

describe('EmbeddableActionStorage', () => {
  describe('.create()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.create).toBe('function');
    });

    test('can add event to embeddable', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      const events1 = embeddable.getInput().events || [];
      expect(events1).toEqual([]);

      await storage.create(event);

      const events2 = embeddable.getInput().events || [];
      expect(events2).toEqual([event]);
    });

    test('can create multiple events', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event1: SerializedEvent = {
        eventId: 'EVENT_ID1',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };
      const event2: SerializedEvent = {
        eventId: 'EVENT_ID2',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };
      const event3: SerializedEvent = {
        eventId: 'EVENT_ID3',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      const events1 = embeddable.getInput().events || [];
      expect(events1).toEqual([]);

      await storage.create(event1);

      const events2 = embeddable.getInput().events || [];
      expect(events2).toEqual([event1]);

      await storage.create(event2);
      await storage.create(event3);

      const events3 = embeddable.getInput().events || [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when creating an event with the same ID', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      await storage.create(event);
      const [, error] = await of(storage.create(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[EEXIST]: Event with [eventId = EVENT_ID] already exists on [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });
});
