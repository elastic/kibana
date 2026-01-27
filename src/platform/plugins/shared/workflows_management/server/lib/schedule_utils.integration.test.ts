/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Frequency } from '@kbn/rrule';
import {
  convertRRuleToTaskSchedule,
  convertWorkflowScheduleToTaskSchedule,
} from './schedule_utils';

/**
 * Integration test to verify RRule scheduling works end-to-end with TaskManager
 */
describe('RRule Scheduling Integration', () => {
  describe('convertRRuleToTaskSchedule', () => {
    it('should convert daily RRule to TaskManager format', () => {
      const rruleConfig = {
        freq: 'DAILY' as const,
        interval: 1,
        tzid: 'UTC',
        byhour: [9],
        byminute: [0],
      };

      const result = convertRRuleToTaskSchedule(rruleConfig);

      // Verify the result matches TaskManager's expected format
      expect(result).toEqual({
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
          byhour: [9],
          byminute: [0],
        },
      });

      // Verify the structure is compatible with TaskManager
      expect(result.rrule).toBeDefined();
      expect(result.rrule.freq).toBe(Frequency.DAILY);
      expect(result.rrule.interval).toBe(1);
      expect(result.rrule.tzid).toBe('UTC');
      expect(result.rrule.byhour).toEqual([9]);
      expect(result.rrule.byminute).toEqual([0]);
    });

    it('should convert weekly RRule to TaskManager format', () => {
      const rruleConfig = {
        freq: 'WEEKLY' as const,
        interval: 1,
        tzid: 'America/New_York',
        byweekday: ['MO', 'FR'],
        byhour: [14],
        byminute: [0],
      };

      const result = convertRRuleToTaskSchedule(rruleConfig);

      expect(result).toEqual({
        rrule: {
          freq: Frequency.WEEKLY,
          interval: 1,
          tzid: 'America/New_York',
          byweekday: ['MO', 'FR'],
          byhour: [14],
          byminute: [0],
        },
      });
    });

    it('should convert monthly RRule to TaskManager format', () => {
      const rruleConfig = {
        freq: 'MONTHLY' as const,
        interval: 1,
        tzid: 'UTC',
        bymonthday: [1, 15],
        byhour: [10],
        byminute: [30],
      };

      const result = convertRRuleToTaskSchedule(rruleConfig);

      expect(result).toEqual({
        rrule: {
          freq: Frequency.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          bymonthday: [1, 15],
          byhour: [10],
          byminute: [30],
        },
      });
    });

    it('should handle custom start date', () => {
      const rruleConfig = {
        freq: 'DAILY' as const,
        interval: 1,
        tzid: 'UTC',
        dtstart: '2024-01-15T09:00:00Z',
        byhour: [9],
        byminute: [0],
      };

      const result = convertRRuleToTaskSchedule(rruleConfig);

      expect(result.rrule.dtstart).toBe('2024-01-15T09:00:00Z');
    });

    it('should validate required fields', () => {
      expect(() => convertRRuleToTaskSchedule({} as any)).toThrow(
        'RRule configuration must include freq, interval, and tzid fields'
      );
    });

    it('should validate frequency values', () => {
      expect(() =>
        convertRRuleToTaskSchedule({
          freq: 'INVALID' as any,
          interval: 1,
          tzid: 'UTC',
        })
      ).toThrow('Invalid RRule frequency: "INVALID"');
    });

    it('should validate weekly frequency requires byweekday', () => {
      expect(() =>
        convertRRuleToTaskSchedule({
          freq: 'WEEKLY',
          interval: 1,
          tzid: 'UTC',
        })
      ).toThrow('WEEKLY frequency requires at least one byweekday value');
    });

    it('should validate monthly frequency requirements', () => {
      expect(() =>
        convertRRuleToTaskSchedule({
          freq: 'MONTHLY',
          interval: 1,
          tzid: 'UTC',
        })
      ).toThrow('MONTHLY frequency requires either bymonthday or byweekday values');
    });
  });

  describe('convertWorkflowScheduleToTaskSchedule', () => {
    it('should convert RRule trigger to TaskManager schedule', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          rrule: {
            freq: 'DAILY',
            interval: 1,
            tzid: 'UTC',
            byhour: [9],
            byminute: [0],
          },
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
          byhour: [9],
          byminute: [0],
        },
      });
    });

    it('should handle complex RRule configuration', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          rrule: {
            freq: 'WEEKLY',
            interval: 2,
            tzid: 'America/New_York',
            byweekday: ['MO', 'WE', 'FR'],
            byhour: [8, 17],
            byminute: [0],
            dtstart: '2024-01-15T08:00:00-05:00',
          },
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        rrule: {
          freq: Frequency.WEEKLY,
          interval: 2,
          tzid: 'America/New_York',
          byweekday: ['MO', 'WE', 'FR'],
          byhour: [8, 17],
          byminute: [0],
          dtstart: '2024-01-15T08:00:00-05:00',
        },
      });
    });

    it('should maintain backward compatibility with interval schedules', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: '5',
          unit: 'm',
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        interval: '5m',
      });
    });

    it('should handle new interval format (e.g., "5m", "2h", "1d")', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: '5m',
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        interval: '5m',
      });
    });

    it('should handle new interval format with hours', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: '2h',
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        interval: '2h',
      });
    });

    it('should handle new interval format with days', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: '1d',
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        interval: '1d',
      });
    });

    it('should handle new interval format with seconds', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: '30s',
        },
      };

      const result = convertWorkflowScheduleToTaskSchedule(trigger);

      expect(result).toEqual({
        interval: '30s',
      });
    });

    it('should throw error for invalid new interval format', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          every: 'invalid',
        },
      };

      expect(() => convertWorkflowScheduleToTaskSchedule(trigger)).toThrow(
        'Invalid schedule configuration. Must have either "rrule" or "every" (e.g., "5m", "2h", "1d")'
      );
    });
  });

  describe('TaskManager Integration', () => {
    it('should produce valid TaskManager task instance format', () => {
      const trigger = {
        type: 'scheduled' as const,
        with: {
          rrule: {
            freq: 'DAILY',
            interval: 1,
            tzid: 'UTC',
            byhour: [9],
            byminute: [0],
          },
        },
      };

      const schedule = convertWorkflowScheduleToTaskSchedule(trigger);

      // This is the format that would be passed to TaskManager.schedule()
      const taskInstance = {
        id: 'workflow:test-workflow:scheduled',
        taskType: 'workflow:scheduled',
        schedule,
        params: {
          workflow: {
            id: 'test-workflow',
            name: 'Test Workflow',
            enabled: true,
            definition: {
              triggers: [trigger],
              steps: [],
              name: 'Test Workflow',
              enabled: false,
              version: '1',
            },
            yaml: '',
          },
          spaceId: 'default',
          triggerType: 'scheduled',
        },
        state: {
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        },
        scope: ['workflows'],
        enabled: true,
      };

      // Verify the task instance structure
      expect(taskInstance.schedule).toBeDefined();
      expect('rrule' in taskInstance.schedule).toBe(true);
      if ('rrule' in taskInstance.schedule) {
        expect(taskInstance.schedule.rrule).toBeDefined();
        expect(taskInstance.schedule.rrule.freq).toBe(Frequency.DAILY);
        expect(taskInstance.schedule.rrule.interval).toBe(1);
        expect(taskInstance.schedule.rrule.tzid).toBe('UTC');
        expect(taskInstance.schedule.rrule.byhour).toEqual([9]);
        expect(taskInstance.schedule.rrule.byminute).toEqual([0]);
      }
    });

    it('should handle multiple RRule patterns', () => {
      const patterns = [
        {
          name: 'Daily at 9 AM UTC',
          rrule: {
            freq: 'DAILY' as const,
            interval: 1,
            tzid: 'UTC',
            byhour: [9],
            byminute: [0],
          },
        },
        {
          name: 'Business hours (weekdays 8 AM & 5 PM EST)',
          rrule: {
            freq: 'DAILY' as const,
            interval: 1,
            tzid: 'America/New_York',
            byweekday: ['MO', 'TU', 'WE', 'TH', 'FR'],
            byhour: [8, 17],
            byminute: [0],
          },
        },
        {
          name: 'Monthly on 1st and 15th',
          rrule: {
            freq: 'MONTHLY' as const,
            interval: 1,
            tzid: 'UTC',
            bymonthday: [1, 15],
            byhour: [10],
            byminute: [30],
          },
        },
      ];

      patterns.forEach(({ name, rrule }) => {
        const trigger = {
          type: 'scheduled' as const,
          with: { rrule },
        };

        const result = convertWorkflowScheduleToTaskSchedule(trigger);

        expect('rrule' in result).toBe(true);
        if ('rrule' in result) {
          expect(result.rrule).toBeDefined();
          expect(result.rrule.freq).toBeDefined();
          expect(result.rrule.interval).toBeDefined();
          expect(result.rrule.tzid).toBeDefined();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid RRule configurations gracefully', () => {
      const invalidConfigs = [
        {
          name: 'Missing required fields',
          config: {},
          expectedError: 'RRule configuration must include freq, interval, and tzid fields',
        },
        {
          name: 'Invalid frequency',
          config: {
            freq: 'INVALID',
            interval: 1,
            tzid: 'UTC',
          },
          expectedError: 'Invalid RRule frequency: "INVALID"',
        },
        {
          name: 'Weekly without byweekday',
          config: {
            freq: 'WEEKLY',
            interval: 1,
            tzid: 'UTC',
          },
          expectedError: 'WEEKLY frequency requires at least one byweekday value',
        },
        {
          name: 'Monthly without bymonthday or byweekday',
          config: {
            freq: 'MONTHLY',
            interval: 1,
            tzid: 'UTC',
          },
          expectedError: 'MONTHLY frequency requires either bymonthday or byweekday values',
        },
      ];

      invalidConfigs.forEach(({ name, config, expectedError }) => {
        expect(() => convertRRuleToTaskSchedule(config as any)).toThrow(expectedError);
      });
    });
  });
});
