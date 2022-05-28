/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OptInConfigService } from './opt_in_config';

describe('OptInConfigService', () => {
  describe('isOptedIn', () => {
    test('Returns `true` when `global.enabled: true`', () => {
      const config = new OptInConfigService({ global: { enabled: true } });
      expect(config.isOptedIn()).toBe(true);
    });

    test('Returns `false` when `global.enabled: false`', () => {
      const config = new OptInConfigService({ global: { enabled: false } });
      expect(config.isOptedIn()).toBe(false);
    });
  });

  describe('isEventTypeOptedIn', () => {
    test('Returns `true` when `global.enabled: true` and no eventType specific config is provided', () => {
      const config = new OptInConfigService({ global: { enabled: true } });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and no eventType specific config is provided', () => {
      const config = new OptInConfigService({ global: { enabled: false } });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(false);
    });

    test('Returns `true` when `global.enabled: true` and event_type config exists but not for the requested eventType', () => {
      const config = new OptInConfigService({
        global: { enabled: true },
        event_types: {
          'test-event-2': { enabled: true },
          'test-event-3': { enabled: false },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and event_type config exists but not for the requested eventType', () => {
      const config = new OptInConfigService({
        global: { enabled: false },
        event_types: {
          'test-event-2': { enabled: true },
          'test-event-3': { enabled: false },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(false);
    });

    test('Returns `true` when `global.enabled: true` and event_type config exists and it is `true`', () => {
      const config = new OptInConfigService({
        global: { enabled: true },
        event_types: {
          'test-event-1': { enabled: true },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and event_type config exists and it is `true`', () => {
      const config = new OptInConfigService({
        global: { enabled: false },
        event_types: {
          'test-event-1': { enabled: true },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(false);
    });

    test('Returns `false` when `global.enabled: true` and event_type config exists and it is `false`', () => {
      const config = new OptInConfigService({
        global: { enabled: true },
        event_types: {
          'test-event-1': { enabled: false },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(false);
    });

    test('Returns `false` when `global.enabled: false` and event_type config exists and it is `false`', () => {
      const config = new OptInConfigService({
        global: { enabled: false },
        event_types: {
          'test-event-1': { enabled: false },
        },
      });
      expect(config.isEventTypeOptedIn('test-event-1')).toBe(false);
    });
  });
  describe('isShipperOptedIn', () => {
    test('Returns `true` when `global.enabled: true` and no shipper specific config is provided', () => {
      const config = new OptInConfigService({ global: { enabled: true } });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(true);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and no shipper specific config is provided', () => {
      const config = new OptInConfigService({ global: { enabled: false } });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(false);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
    });

    test('Returns `true` when `global.enabled: true` and shipper config exists but not for the requested eventType', () => {
      const config = new OptInConfigService({
        global: {
          enabled: true,
          shippers: {
            'test-shipper-2': true,
            'test-shipper-3': false,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(true);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and shipper config exists but not for the requested eventType', () => {
      const config = new OptInConfigService({
        global: {
          enabled: false,
          shippers: {
            'test-shipper-2': true,
            'test-shipper-3': false,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(false);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
    });

    test('Returns `true` when `global.enabled: true` and shipper config exists and it is `true`', () => {
      const config = new OptInConfigService({
        global: {
          enabled: true,
          shippers: {
            'test-shipper-1': true,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(true);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
    });

    test('Returns `false` when `global.enabled: false` and shipper config exists and it is `true`', () => {
      const config = new OptInConfigService({
        global: {
          enabled: false,
          shippers: {
            'test-shipper-1': true,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(false);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
    });

    test('Returns `false` when `global.enabled: true` and shipper config exists and it is `false`', () => {
      const config = new OptInConfigService({
        global: {
          enabled: true,
          shippers: {
            'test-shipper-1': false,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(false);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
    });

    test('Returns `false` when `global.enabled: false` and shipper config exists and it is `false`', () => {
      const config = new OptInConfigService({
        global: {
          enabled: false,
          shippers: {
            'test-shipper-1': false,
          },
        },
      });
      expect(config.isShipperOptedIn('test-shipper-1')).toBe(false);
      expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
    });

    describe('with event_type config', () => {
      test('Returns `true` when `global.enabled: true`, `shipper: true` and `event: true` (no `event.shippers`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
      });

      test('Returns `true` when `global.enabled: true`, `shipper: true`, `event: true` (`event.shippers` exists but for others)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
              shippers: {
                'test-shipper-2': false,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
      });

      test('Returns `true` when `global.enabled: true`, `shipper: true`, `event: true` (`event.shipper: true`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
              shippers: {
                'test-shipper-1': true,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(true);
      });

      test('Returns `false` when `global.enabled: false`, `shipper: true`, `event: true` (`event.shipper: true`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: false,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
              shippers: {
                'test-shipper-1': true,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
      });

      test('Returns `false` when `global.enabled: true`, `shipper: false`, `event: true` (`event.shipper: true`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': false,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
              shippers: {
                'test-shipper-1': true,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
      });

      test('Returns `false` when `global.enabled: true`, `shipper: true`, `event: false` (`event.shipper: true`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: false,
              shippers: {
                'test-shipper-1': true,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
      });

      test('Returns `false` when `global.enabled: true`, `shipper: true`, `event: true` (`event.shipper: false`)', () => {
        const config = new OptInConfigService({
          global: {
            enabled: true,
            shippers: {
              'test-shipper-1': true,
            },
          },
          event_types: {
            'test-event-1': {
              enabled: true,
              shippers: {
                'test-shipper-1': false,
              },
            },
          },
        });
        expect(config.isShipperOptedIn('test-shipper-1', 'test-event-1')).toBe(false);
      });
    });
  });
});
