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

  describe('.update()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.update).toBe('function');
    });

    test('can update an existing event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'foo',
        } as any,
      };
      const event2: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'bar',
        } as any,
      };

      await storage.create(event1);
      await storage.update(event2);

      const events = embeddable.getInput().events || [];
      expect(events).toEqual([event2]);
    });

    test('updates event in place of the old event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: SerializedEvent = {
        eventId: 'EVENT_ID1',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'foo',
        } as any,
      };
      const event2: SerializedEvent = {
        eventId: 'EVENT_ID2',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'bar',
        } as any,
      };
      const event22: SerializedEvent = {
        eventId: 'EVENT_ID2',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'baz',
        } as any,
      };
      const event3: SerializedEvent = {
        eventId: 'EVENT_ID3',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'qux',
        } as any,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = embeddable.getInput().events || [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.update(event22);

      const events2 = embeddable.getInput().events || [];
      expect(events2).toEqual([event1, event22, event3]);

      await storage.update(event2);

      const events3 = embeddable.getInput().events || [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when updating event, but storage is empty', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      const [, error] = await of(storage.update(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be updated as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('throws when updating event with ID that is not stored', async () => {
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

      await storage.create(event1);
      const [, error] = await of(storage.update(event2));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID2] could not be updated as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });

  describe('.remove()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.remove).toBe('function');
    });

    test('can remove existing event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      await storage.create(event);
      await storage.remove(event.eventId);

      const events = embeddable.getInput().events || [];
      expect(events).toEqual([]);
    });

    test('removes correct events in a list of events', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: SerializedEvent = {
        eventId: 'EVENT_ID1',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'foo',
        } as any,
      };
      const event2: SerializedEvent = {
        eventId: 'EVENT_ID2',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'bar',
        } as any,
      };
      const event3: SerializedEvent = {
        eventId: 'EVENT_ID3',
        triggerId: 'TRIGGER-ID',
        action: {
          name: 'qux',
        } as any,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = embeddable.getInput().events || [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.remove(event2.eventId);

      const events2 = embeddable.getInput().events || [];
      expect(events2).toEqual([event1, event3]);

      await storage.remove(event3.eventId);

      const events3 = embeddable.getInput().events || [];
      expect(events3).toEqual([event1]);

      await storage.remove(event1.eventId);

      const events4 = embeddable.getInput().events || [];
      expect(events4).toEqual([]);
    });

    test('throws when removing an event from an empty storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const [, error] = await of(storage.remove('EVENT_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be removed as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('throws when removing with ID that does not exist in storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: SerializedEvent = {
        eventId: 'EVENT_ID',
        triggerId: 'TRIGGER-ID',
        action: {} as any,
      };

      await storage.create(event);
      const [, error] = await of(storage.remove('WRONG_ID'));
      await storage.remove(event.eventId);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = WRONG_ID] could not be removed as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });
});
