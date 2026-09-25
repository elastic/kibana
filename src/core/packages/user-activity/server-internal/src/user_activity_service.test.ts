/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as timer } from 'timers/promises';
import { BehaviorSubject } from 'rxjs';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock, loggingServiceMock } from '@kbn/core-logging-server-mocks';
import type { InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { TrackUserActionParams, UserActivityActionId } from '@kbn/core-user-activity-server';
import { UserActivityService } from './user_activity_service';
import type { InternalUserActivityServiceSetup } from './types';

const TEST_ACTION = 'create_alerting_rule' as UserActivityActionId;
const OTHER_ACTION = 'create_alerting_rule_bulk' as UserActivityActionId;

const defaultConfig = {
  enabled: true,
  appenders: new Map([
    ['console_appender', { type: 'console', layout: { type: 'json' } }],
    [
      'file_appender',
      {
        type: 'file',
        fileName: 'easy_to_find.jsonl',
        layout: { type: 'json' },
      },
    ],
  ]),
  filters: [],
};

describe('UserActivityService', () => {
  let service: InternalUserActivityServiceSetup;
  let core: ReturnType<typeof mockCoreContext.create>;
  let loggingService: jest.Mocked<InternalLoggingServiceSetup>;

  beforeEach(() => {
    core = mockCoreContext.create();
    core.configService.atPath.mockReturnValue(new BehaviorSubject(defaultConfig));
    loggingService = loggingServiceMock.createInternalSetupContract();
  });

  describe('setup', () => {
    beforeEach(() => {
      service = new UserActivityService(core).setup({ logging: loggingService });
    });

    it('configures logging with user_activity namespace', () => {
      expect(loggingService.configure).toHaveBeenCalledTimes(1);
      expect(loggingService.configure).toHaveBeenCalledWith(['user_activity'], expect.any(Object));
    });
  });

  describe('trackUserAction', () => {
    beforeEach(() => {
      service = new UserActivityService(core).setup({ logging: loggingService });
    });

    it('logs a user action with provided message', () => {
      service.trackUserAction({
        message: 'Custom message for action',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test Object', type: 'rule', tags: ['tag1'] },
      });

      expect(loggingSystemMock.collect(core.logger).info).toEqual([
        [
          'Custom message for action',
          {
            message: 'Custom message for action',
            event: { action: TEST_ACTION, type: ['change'], outcome: 'unknown' },
            kibana: { object: { id: 'obj-1', name: 'Test Object', type: 'rule', tags: ['tag1'] } },
          },
        ],
      ]);
    });

    it('does not log the object at the top level', () => {
      service.trackUserAction({
        message: 'Custom message for action',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test Object', type: 'rule', tags: ['tag1'] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).not.toHaveProperty('object');
      expect(logCalls[0][1]).toMatchObject({
        kibana: { object: { id: 'obj-1', name: 'Test Object', type: 'rule', tags: ['tag1'] } },
      });
    });

    it('defaults event.outcome to unknown when not provided', () => {
      service.trackUserAction({
        message: 'Action without outcome',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-o', name: 'Object', type: 'rule', tags: [] },
      });

      expect(loggingSystemMock.collect(core.logger).info[0][1]).toMatchObject({
        event: { action: TEST_ACTION, type: ['change'], outcome: 'unknown' },
      });
    });

    it('logs optional event timing fields and metadata', () => {
      const params: TrackUserActionParams = {
        message: 'Action with metadata',
        event: {
          action: TEST_ACTION,
          type: ['change'],
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-01T00:00:00.250Z',
          duration: 250000000,
        },
        object: { id: 'obj-meta', name: 'Object', type: 'rule', tags: [] },
        metadata: {
          field1: 'val1',
          field2: 'val2',
          num1: 1,
        },
      };

      service.trackUserAction(params);

      const { object, ...paramsWithoutObject } = params;
      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0][0]).toBe('Action with metadata');
      expect(logCalls[0][1]).toMatchObject({
        ...paramsWithoutObject,
        kibana: { object },
      });
    });

    it('logs optional event.outcome on the event object', () => {
      service.trackUserAction({
        message: 'Failed action',
        event: { action: TEST_ACTION, type: ['error'], outcome: 'failure' },
        object: { id: 'obj-e', name: 'Object', type: 'rule', tags: [] },
      });

      expect(loggingSystemMock.collect(core.logger).info[0][1]).toMatchObject({
        event: { action: TEST_ACTION, type: ['error'], outcome: 'failure' },
      });
    });

    it('logs optional top-level ECS error fields', () => {
      service.trackUserAction({
        message: 'User failed to create a rule.',
        event: { action: TEST_ACTION, type: ['creation'], outcome: 'failure' },
        object: { id: 'obj-err', name: 'Rule', type: 'rule', tags: [] },
        error: {
          type: 'ResponseError',
          message: 'index_not_found_exception',
          code: '404',
          stack_trace: 'Error: index_not_found_exception\n    at handler',
        },
      });

      expect(loggingSystemMock.collect(core.logger).info[0][1]).toMatchObject({
        event: { outcome: 'failure' },
        error: {
          type: 'ResponseError',
          message: 'index_not_found_exception',
          code: '404',
          stack_trace: 'Error: index_not_found_exception\n    at handler',
        },
      });
    });

    it('merges outcome, error, and metadata into the log meta object', () => {
      const params: TrackUserActionParams = {
        message: 'Merged payload',
        event: { action: TEST_ACTION, type: ['change'], outcome: 'success' },
        object: { id: 'obj-m', name: 'Obj', type: 'dashboard', tags: ['t1'] },
        metadata: { attempt: 1 },
        error: { message: 'ignored downstream' },
      };

      service.trackUserAction(params);

      expect(loggingSystemMock.collect(core.logger).info[0][1]).toMatchObject({
        message: 'Merged payload',
        event: { action: TEST_ACTION, type: ['change'], outcome: 'success' },
        kibana: { object: { id: 'obj-m', name: 'Obj', type: 'dashboard', tags: ['t1'] } },
        metadata: { attempt: 1 },
        error: { message: 'ignored downstream' },
      });
    });

    it('generates default message when not provided', () => {
      service.setInjectedContext({
        user: { name: 'test_user' },
      });

      service.trackUserAction({
        event: { action: TEST_ACTION, type: ['creation'] },
        object: { id: 'obj-2', name: 'My rule', type: 'rule', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0][0]).toBe(
        'User test_user performed create_alerting_rule on My rule (obj-2)'
      );
    });

    it('includes injected context in logs', () => {
      service.setInjectedContext({
        user: {
          id: 'jesuswr',
          name: 'jesuswr',
          email: 'jesuswr@test.com',
          roles: ['superuser', 'normaluser', 'magicknight'],
        },
        kibana: { space: { id: 'default' }, session: { id: 'session-456' } },
      });

      service.trackUserAction({
        message: 'Test action',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-3', name: 'Object', type: 'visualization', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: {
          id: 'jesuswr',
          name: 'jesuswr',
          email: 'jesuswr@test.com',
          roles: ['superuser', 'normaluser', 'magicknight'],
        },
        kibana: {
          space: { id: 'default' },
          session: { id: 'session-456' },
          object: { id: 'obj-3', name: 'Object', type: 'visualization', tags: [] },
        },
      });
    });

    it('does nothing when service is disabled', () => {
      const coreWithDisabledConfig = mockCoreContext.create();
      coreWithDisabledConfig.configService.atPath.mockReturnValue(
        new BehaviorSubject({ ...defaultConfig, enabled: false })
      );
      const disabledService = new UserActivityService(coreWithDisabledConfig).setup({
        logging: loggingService,
      });

      disabledService.trackUserAction({
        message: 'Should not log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithDisabledConfig.logger).info).toHaveLength(0);
    });

    it('does nothing when action is dropped by filters', () => {
      const coreWithFilters = mockCoreContext.create();
      coreWithFilters.configService.atPath.mockReturnValue(
        new BehaviorSubject({
          ...defaultConfig,
          filters: [{ policy: 'drop', actions: [TEST_ACTION] }],
        })
      );
      const filteredService = new UserActivityService(coreWithFilters).setup({
        logging: loggingService,
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithFilters.logger).info).toHaveLength(0);
    });

    it('logs only kept actions when using keep policy', () => {
      const coreWithFilters = mockCoreContext.create();
      coreWithFilters.configService.atPath.mockReturnValue(
        new BehaviorSubject({
          ...defaultConfig,
          filters: [{ policy: 'keep', actions: [TEST_ACTION] }],
        })
      );
      const filteredService = new UserActivityService(coreWithFilters).setup({
        logging: loggingService,
      });

      filteredService.trackUserAction({
        message: 'Should log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: OTHER_ACTION, type: ['change'] },
        object: { id: 'obj-2', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithFilters.logger).info).toHaveLength(1);
      expect(loggingSystemMock.collect(coreWithFilters.logger).info[0][0]).toBe('Should log');
    });

    it('supports keep + drop together (drop wins for matching actions)', () => {
      const coreWithFilters = mockCoreContext.create();
      coreWithFilters.configService.atPath.mockReturnValue(
        new BehaviorSubject({
          ...defaultConfig,
          filters: [
            { policy: 'keep', actions: [TEST_ACTION, OTHER_ACTION] },
            { policy: 'drop', actions: [OTHER_ACTION] },
          ],
        })
      );
      const filteredService = new UserActivityService(coreWithFilters).setup({
        logging: loggingService,
      });

      filteredService.trackUserAction({
        message: 'Should log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: OTHER_ACTION, type: ['change'] },
        object: { id: 'obj-2', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithFilters.logger).info).toHaveLength(1);
      expect(loggingSystemMock.collect(coreWithFilters.logger).info[0][0]).toBe('Should log');
    });

    it('applies multiple keep filters (intersection)', () => {
      const coreWithFilters = mockCoreContext.create();
      coreWithFilters.configService.atPath.mockReturnValue(
        new BehaviorSubject({
          ...defaultConfig,
          filters: [
            { policy: 'keep', actions: [TEST_ACTION] },
            { policy: 'keep', actions: [TEST_ACTION, OTHER_ACTION] },
          ],
        })
      );
      const filteredService = new UserActivityService(coreWithFilters).setup({
        logging: loggingService,
      });

      filteredService.trackUserAction({
        message: 'Should log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: OTHER_ACTION, type: ['change'] },
        object: { id: 'obj-2', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithFilters.logger).info).toHaveLength(1);
      expect(loggingSystemMock.collect(coreWithFilters.logger).info[0][0]).toBe('Should log');
    });

    it('applies multiple drop filters (union)', () => {
      const coreWithFilters = mockCoreContext.create();
      coreWithFilters.configService.atPath.mockReturnValue(
        new BehaviorSubject({
          ...defaultConfig,
          filters: [
            { policy: 'drop', actions: [TEST_ACTION] },
            { policy: 'drop', actions: [OTHER_ACTION] },
          ],
        })
      );
      const filteredService = new UserActivityService(coreWithFilters).setup({
        logging: loggingService,
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      filteredService.trackUserAction({
        message: 'Should not log',
        event: { action: OTHER_ACTION, type: ['change'] },
        object: { id: 'obj-2', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithFilters.logger).info).toHaveLength(0);
    });
  });

  describe('kibana.saved_object', () => {
    beforeEach(() => {
      service = new UserActivityService(core).setup({ logging: loggingService });
    });

    const createStartedService = (registeredTypeNames: string[]) => {
      const userActivityService = new UserActivityService(core);
      userActivityService.setup({ logging: loggingService });
      const typeRegistry = typeRegistryMock.create();
      typeRegistry.getAllTypes.mockReturnValue(
        registeredTypeNames.map((name) => ({ name } as SavedObjectsType))
      );
      return userActivityService.start({ typeRegistry });
    };

    it('emits kibana.saved_object when object.type is a registered saved object type', () => {
      const startedService = createStartedService(['dashboard', 'index-pattern']);

      startedService.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'dash-1', name: 'My Dashboard', type: 'dashboard', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        kibana: {
          object: { id: 'dash-1', name: 'My Dashboard', type: 'dashboard', tags: [] },
          saved_object: { type: 'dashboard', id: 'dash-1' },
        },
      });
    });

    it('omits kibana.saved_object when object.type is not a registered saved object type', () => {
      const startedService = createStartedService(['dashboard']);

      startedService.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'rule-1', name: 'My Rule', type: 'rule', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        kibana: { object: { id: 'rule-1', name: 'My Rule', type: 'rule', tags: [] } },
      });
      expect(logCalls[0][1]).not.toHaveProperty('kibana.saved_object');
    });

    it('omits kibana.saved_object when the type registry is not available yet', () => {
      // `service` only went through setup, so the registry has not been read.
      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'dash-1', name: 'My Dashboard', type: 'dashboard', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        kibana: { object: { id: 'dash-1', name: 'My Dashboard', type: 'dashboard', tags: [] } },
      });
      expect(logCalls[0][1]).not.toHaveProperty('kibana.saved_object');
    });

    it('reads the type registry only once at start', () => {
      const userActivityService = new UserActivityService(core);
      const setupContract = userActivityService.setup({ logging: loggingService });
      const typeRegistry = typeRegistryMock.create();
      typeRegistry.getAllTypes.mockReturnValue([{ name: 'dashboard' } as SavedObjectsType]);
      userActivityService.start({ typeRegistry });

      setupContract.trackUserAction({
        message: 'First',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'dash-1', name: 'Dash', type: 'dashboard', tags: [] },
      });
      setupContract.trackUserAction({
        message: 'Second',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: 'dash-2', name: 'Dash', type: 'dashboard', tags: [] },
      });

      expect(typeRegistry.getAllTypes).toHaveBeenCalledTimes(1);
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(2);
    });
  });

  describe('setInjectedContext', () => {
    beforeEach(() => {
      service = new UserActivityService(core).setup({ logging: loggingService });
    });

    it('sets user context', () => {
      service.setInjectedContext({
        user: { id: 'user-1', name: 'testuser' },
        client: { ip: '127.0.0.1', address: '127.0.0.1' },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: { id: 'user-1', name: 'testuser' },
        client: { ip: '127.0.0.1', address: '127.0.0.1' },
        source: { ip: '127.0.0.1', address: '127.0.0.1' },
      });
    });

    it('does not emit source fields when there is no client ip', () => {
      service.setInjectedContext({
        user: { id: 'user-1', name: 'testuser' },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).not.toHaveProperty('source');
    });

    it('sets session context under kibana.session', () => {
      service.setInjectedContext({
        kibana: { session: { id: 'session-abc' } },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        kibana: { session: { id: 'session-abc' } },
      });
      expect(logCalls[0][1]).not.toHaveProperty('session');
    });

    it('sets kibana space context', () => {
      service.setInjectedContext({
        kibana: { space: { id: 'my-space' } },
        http: { request: { referrer: 'elastic.co' } },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        kibana: { space: { id: 'my-space' } },
        http: { request: { referrer: 'elastic.co' } },
      });
    });

    it('merges context across multiple calls', () => {
      service.setInjectedContext({
        user: { id: 'user-1' },
      });

      service.setInjectedContext({
        user: { name: 'testuser' },
        kibana: { session: { id: 'session-1' } },
      });

      service.setInjectedContext({
        kibana: { space: { id: 'space-1' } },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: { id: 'user-1', name: 'testuser' },
        kibana: { space: { id: 'space-1' }, session: { id: 'session-1' } },
      });
    });

    it('maintains context isolation across async operations', async () => {
      const chainA = Promise.resolve().then(async () => {
        service.setInjectedContext({
          user: { name: 'user-a' },
          kibana: { session: { id: 'session-a' } },
        });
        await timer(100);
        service.trackUserAction({
          message: 'Action A',
          event: { action: TEST_ACTION, type: ['change'] },
          object: { id: 'a', name: 'A', type: 'test', tags: [] },
        });
      });

      const chainB = Promise.resolve().then(async () => {
        service.setInjectedContext({
          user: { name: 'user-b' },
          kibana: { session: { id: 'session-b' } },
        });
        await timer(10);
        service.trackUserAction({
          message: 'Action B',
          event: { action: TEST_ACTION, type: ['change'] },
          object: { id: 'b', name: 'B', type: 'test', tags: [] },
        });
      });

      await Promise.all([chainA, chainB]);

      const logCalls = loggingSystemMock.collect(core.logger).info;
      // B finishes first due to shorter timer
      expect(logCalls[0][1]).toMatchObject({
        user: { name: 'user-b' },
        kibana: { session: { id: 'session-b' } },
      });
      // A finishes second but keeps its values
      expect(logCalls[1][1]).toMatchObject({
        user: { name: 'user-a' },
        kibana: { session: { id: 'session-a' } },
      });
    });

    it('inherits context from parent async execution', async () => {
      await Promise.resolve().then(async () => {
        // Parent sets initial context
        service.setInjectedContext({
          user: { name: 'parent-user' },
          kibana: { space: { id: 'parent-space' }, session: { id: 'parent-session' } },
        });

        // Child async operation should inherit parent's context
        await Promise.resolve().then(async () => {
          // Child adds more context (should merge with parent's)
          service.setInjectedContext({
            kibana: { space: { id: 'child-space' } },
          });

          await timer(10);

          service.trackUserAction({
            message: 'Child action',
            event: { action: TEST_ACTION, type: ['change'] },
            object: { id: 'child', name: 'Child', type: 'test', tags: [] },
          });
        });
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      // Should have both parent's context and child's additions
      expect(logCalls[0][1]).toMatchObject({
        user: { name: 'parent-user' },
        kibana: { space: { id: 'child-space' }, session: { id: 'parent-session' } },
      });
    });
  });

  describe('stop', () => {
    it('disables the service', () => {
      const userActivityService = new UserActivityService(core);
      const setupContract = userActivityService.setup({ logging: loggingService });

      // Verify service is working
      setupContract.trackUserAction({
        message: 'Before stop',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(1);

      // Stop the service
      userActivityService.stop();

      // Verify service is disabled
      setupContract.trackUserAction({
        message: 'After stop',
        event: { action: TEST_ACTION, type: ['change'] },
        object: { id: '2', name: 'Test', type: 'test', tags: [] },
      });
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(1);
    });
  });

  describe('config', () => {
    it('reacts to config changes', async () => {
      const config$ = new BehaviorSubject({ ...defaultConfig, enabled: false });
      core.configService.atPath.mockReturnValue(config$);
      service = new UserActivityService(core).setup({ logging: loggingService });

      const trackAction = () => {
        service.trackUserAction({
          message: 'Test action',
          event: { action: TEST_ACTION, type: ['change'] },
          object: { id: '1', name: 'Test', type: 'test', tags: [] },
        });
      };

      // Service is disabled
      trackAction();
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(0);

      // Enable the service
      config$.next({ ...defaultConfig, enabled: true });

      trackAction();
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(1);

      // Disable again
      config$.next({ ...defaultConfig, enabled: false });

      trackAction();
      // Still 1 because the new action wasn't logged
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(1);
    });
  });
});
