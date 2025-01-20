/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setupEventStreamService } from './tests/setup_event_stream_service';

const setup = setupEventStreamService;

describe('EventStreamService', () => {
  describe('.tail()', () => {
    test('returns no events by default', async () => {
      const { service } = setup();

      service.flush();

      const events = await service.tail();

      expect(events).toStrictEqual([]);
    });
  });

  describe('validation', () => {
    describe('event time', () => {
      test('cannot be too far in the future', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              time: 4000000000000,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('cannot be too far in the past', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              time: 1,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('cannot be a float', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              time: Date.now() + 0.5,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('cannot be a string', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              time: String(Date.now()) as any,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });
    });

    describe('event subject', () => {
      test('type cannot be empty', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              subject: ['', '123'],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('type cannot be too long', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              subject: [
                '0123456789012345678901234567890123456789012345678901234567890123456789',
                '123',
              ],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('ID cannot be too long', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              subject: [
                'dashboard',
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
              ],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('cannot be null', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              subject: null as any,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });
    });

    describe('event predicate', () => {
      test('type cannot be missing', async () => {
        const { service } = setup();
        expect(() => service.addEvents([{} as any])).toThrow();
      });

      test('type cannot be null', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: null as any,
            },
          ])
        ).toThrow();
      });

      test('type cannot be a number', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: [123 as any],
            },
          ])
        ).toThrow();
      });

      test('type cannot be an empty string', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: [''],
            },
          ])
        ).toThrow();
      });

      test('cannot be a long string', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['0123456789012345678901234567890123456789012345678901234567890123456789'],
            },
          ])
        ).toThrow();
      });

      test('can be a short string', async () => {
        const { service } = setup();
        service.addEvents([
          {
            predicate: ['view'],
          },
        ]);
      });

      test('can have attributes', async () => {
        const { service } = setup();
        service.addEvents([
          {
            predicate: [
              'view',
              {
                foo: 'bar',
              },
            ],
          },
        ]);
      });

      test('attributes cannot be empty', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['view', {}],
            },
          ])
        ).toThrow();
      });

      test('attributes cannot be null', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['view', null as any],
            },
          ])
        ).toThrow();
      });
    });

    describe('event object', () => {
      test('type cannot be empty', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              object: ['', '123'],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('type cannot be too long', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              object: [
                '0123456789012345678901234567890123456789012345678901234567890123456789',
                '123',
              ],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('ID cannot be too long', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              object: [
                'dashboard',
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
              ],
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });

      test('cannot be null', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              object: null as any,
              predicate: ['test'],
            },
          ])
        ).toThrow();
      });
    });

    describe('event transaction', () => {
      test('can be missing', async () => {
        const { service } = setup();
        service.addEvents([
          {
            predicate: ['test'],
          },
        ]);
      });

      test('cannot be empty', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['test'],
              transaction: '',
            },
          ])
        ).toThrow();
      });

      test('cannot be too long', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['test'],
              transaction:
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
            },
          ])
        ).toThrow();
      });

      test('cannot be an integer', async () => {
        const { service } = setup();
        expect(() =>
          service.addEvents([
            {
              predicate: ['test'],
              transaction: 123 as any,
            },
          ])
        ).toThrow();
      });
    });
  });
});
