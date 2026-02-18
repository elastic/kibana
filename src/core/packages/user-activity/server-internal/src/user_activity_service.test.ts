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
import { UserActivityService } from './user_activity_service';
import type { InternalUserActivityServiceSetup } from './types';

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
        event: { action: 'create', type: 'creation' },
        object: { id: 'obj-1', name: 'Test Object', type: 'dashboard', tags: ['tag1'] },
      });

      expect(loggingSystemMock.collect(core.logger).info).toEqual([
        [
          'Custom message for action',
          {
            message: 'Custom message for action',
            event: { action: 'create', type: 'creation' },
            object: { id: 'obj-1', name: 'Test Object', type: 'dashboard', tags: ['tag1'] },
          },
        ],
      ]);
    });

    it('generates default message when not provided', () => {
      service.setInjectedContext({
        user: { username: 'test_user' },
      });

      service.trackUserAction({
        event: { action: 'delete', type: 'deletion' },
        object: { id: 'obj-2', name: 'My Dashboard', type: 'dashboard', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0][0]).toBe('User test_user performed delete on My Dashboard (obj-2)');
    });

    it('includes injected context in logs', () => {
      service.setInjectedContext({
        user: {
          id: 'jesuswr',
          username: 'jesuswr',
          email: 'jesuswr@test.com',
          roles: ['superuser', 'normaluser', 'magicknight'],
        },
        session: { id: 'session-456' },
        kibana: { space: { id: 'default' } },
      });

      service.trackUserAction({
        message: 'Test action',
        event: { action: 'update', type: 'change' },
        object: { id: 'obj-3', name: 'Object', type: 'visualization', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: {
          id: 'jesuswr',
          username: 'jesuswr',
          email: 'jesuswr@test.com',
          roles: ['superuser', 'normaluser', 'magicknight'],
        },
        session: { id: 'session-456' },
        kibana: { space: { id: 'default' } },
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
        event: { action: 'create', type: 'creation' },
        object: { id: 'obj-1', name: 'Test', type: 'test', tags: [] },
      });

      expect(loggingSystemMock.collect(coreWithDisabledConfig.logger).info).toHaveLength(0);
    });
  });

  describe('setInjectedContext', () => {
    beforeEach(() => {
      service = new UserActivityService(core).setup({ logging: loggingService });
    });

    it('sets user context', () => {
      service.setInjectedContext({
        user: { id: 'user-1', username: 'testuser' },
        client: { ip: '127.0.0.1', address: '127.0.0.1' },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: 'test', type: 'change' },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: { id: 'user-1', username: 'testuser' },
        client: { ip: '127.0.0.1', address: '127.0.0.1' },
      });
    });

    it('sets session context', () => {
      service.setInjectedContext({
        session: { id: 'session-abc' },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: 'test', type: 'change' },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        session: { id: 'session-abc' },
      });
    });

    it('sets kibana space context', () => {
      service.setInjectedContext({
        kibana: { space: { id: 'my-space' } },
        http: { request: { referrer: 'elastic.co' } },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: 'test', type: 'change' },
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
        user: { username: 'testuser' },
        session: { id: 'session-1' },
      });

      service.setInjectedContext({
        kibana: { space: { id: 'space-1' } },
      });

      service.trackUserAction({
        message: 'Test',
        event: { action: 'test', type: 'change' },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      expect(logCalls[0][1]).toMatchObject({
        user: { id: 'user-1', username: 'testuser' },
        session: { id: 'session-1' },
        kibana: { space: { id: 'space-1' } },
      });
    });

    it('maintains context isolation across async operations', async () => {
      const chainA = Promise.resolve().then(async () => {
        service.setInjectedContext({
          user: { username: 'user-a' },
          session: { id: 'session-a' },
        });
        await timer(100);
        service.trackUserAction({
          message: 'Action A',
          event: { action: 'action-a', type: 'change' },
          object: { id: 'a', name: 'A', type: 'test', tags: [] },
        });
      });

      const chainB = Promise.resolve().then(async () => {
        service.setInjectedContext({
          user: { username: 'user-b' },
          session: { id: 'session-b' },
        });
        await timer(10);
        service.trackUserAction({
          message: 'Action B',
          event: { action: 'action-b', type: 'change' },
          object: { id: 'b', name: 'B', type: 'test', tags: [] },
        });
      });

      await Promise.all([chainA, chainB]);

      const logCalls = loggingSystemMock.collect(core.logger).info;
      // B finishes first due to shorter timer
      expect(logCalls[0][1]).toMatchObject({
        user: { username: 'user-b' },
        session: { id: 'session-b' },
      });
      // A finishes second but keeps its values
      expect(logCalls[1][1]).toMatchObject({
        user: { username: 'user-a' },
        session: { id: 'session-a' },
      });
    });

    it('inherits context from parent async execution', async () => {
      await Promise.resolve().then(async () => {
        // Parent sets initial context
        service.setInjectedContext({
          user: { username: 'parent-user' },
          session: { id: 'parent-session' },
          kibana: { space: { id: 'parent-space' } },
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
            event: { action: 'child-action', type: 'change' },
            object: { id: 'child', name: 'Child', type: 'test', tags: [] },
          });
        });
      });

      const logCalls = loggingSystemMock.collect(core.logger).info;
      // Should have both parent's context and child's additions
      expect(logCalls[0][1]).toMatchObject({
        user: { username: 'parent-user' },
        session: { id: 'parent-session' },
        kibana: { space: { id: 'child-space' } },
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
        event: { action: 'test', type: 'change' },
        object: { id: '1', name: 'Test', type: 'test', tags: [] },
      });
      expect(loggingSystemMock.collect(core.logger).info).toHaveLength(1);

      // Stop the service
      userActivityService.stop();

      // Verify service is disabled
      setupContract.trackUserAction({
        message: 'After stop',
        event: { action: 'test', type: 'change' },
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
          event: { action: 'test', type: 'change' },
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
