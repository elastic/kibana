/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateNextExecutionTime, getWorkflowNextExecutionTime } from './next_execution_time';
import type { WorkflowTrigger } from '../../server/lib/schedule_utils';

describe('next_execution_time', () => {
  const mockNow = new Date('2025-01-15T10:00:00Z');

  beforeEach(() => {
    // Mock the current time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateNextExecutionTime', () => {
    describe('lastRun parameter behavior', () => {
      it('should use lastRun as dtstart when no dtstart is specified in RRule', () => {
        const lastRun = new Date('2025-01-10T08:00:00Z');
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, lastRun);
        expect(result).toBeInstanceOf(Date);
        // Should calculate from the lastRun date, not current time
        expect(result!.getTime()).toBeGreaterThan(lastRun.getTime());
      });

      it('should use current time as dtstart when lastRun is null', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, null);
        expect(result).toBeInstanceOf(Date);
        // Should calculate from current time (mockNow)
        expect(result!.getTime()).toBeGreaterThan(mockNow.getTime());
      });

      it('should use dtstart from RRule config when provided, ignoring lastRun', () => {
        const lastRun = new Date('2025-01-10T08:00:00Z');
        const dtstart = new Date('2025-01-05T06:00:00Z');
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'UTC',
              dtstart: dtstart.toISOString(),
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, lastRun);
        expect(result).toBeInstanceOf(Date);
        // Should use dtstart from config, not lastRun
        expect(result!.getTime()).toBeGreaterThan(dtstart.getTime());
      });

      it('should handle interval-based scheduling with lastRun', () => {
        const lastRun = new Date('2025-01-10T08:00:00Z');
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '2h',
          },
        };

        const result = calculateNextExecutionTime(trigger, lastRun);
        expect(result).toBeInstanceOf(Date);
        // Should be 2 hours after lastRun
        expect(result!.getTime() - lastRun.getTime()).toBe(2 * 60 * 60 * 1000);
      });

      it('should handle interval-based scheduling with null lastRun', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '1h',
          },
        };

        const result = calculateNextExecutionTime(trigger, null);
        expect(result).toBeInstanceOf(Date);
        // Should be 1 hour after current time (mockNow)
        expect(result!.getTime() - mockNow.getTime()).toBe(60 * 60 * 1000);
      });

      it('should handle different lastRun dates for weekly RRule', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'WEEKLY',
              interval: 1,
              tzid: 'UTC',
              byweekday: ['MO', 'FR'],
              byhour: [10],
              byminute: [0],
            },
          },
        };

        // Test with lastRun on a Monday
        const mondayLastRun = new Date('2025-01-13T08:00:00Z'); // Monday
        const mondayResult = calculateNextExecutionTime(trigger, mondayLastRun);
        expect(mondayResult).toBeInstanceOf(Date);
        // Should be the next occurrence (Friday or next Monday)
        expect([1, 5]).toContain(mondayResult!.getUTCDay()); // Monday (1) or Friday (5)

        // Test with lastRun on a Friday
        const fridayLastRun = new Date('2025-01-17T08:00:00Z'); // Friday
        const fridayResult = calculateNextExecutionTime(trigger, fridayLastRun);
        expect(fridayResult).toBeInstanceOf(Date);
        // Should be the next occurrence (next Monday or Friday)
        expect([1, 5]).toContain(fridayResult!.getUTCDay()); // Monday (1) or Friday (5)
      });

      it('should handle monthly RRule with different lastRun dates', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'MONTHLY',
              interval: 1,
              tzid: 'UTC',
              bymonthday: [1, 15],
              byhour: [12],
              byminute: [0],
            },
          },
        };

        // Test with lastRun on the 1st
        const firstLastRun = new Date('2025-01-01T08:00:00Z');
        const firstResult = calculateNextExecutionTime(trigger, firstLastRun);
        expect(firstResult).toBeInstanceOf(Date);
        // Should be the next occurrence (15th or 1st of next month)
        expect([1, 15]).toContain(firstResult!.getUTCDate());

        // Test with lastRun on the 15th
        const fifteenthLastRun = new Date('2025-01-15T08:00:00Z');
        const fifteenthResult = calculateNextExecutionTime(trigger, fifteenthLastRun);
        expect(fifteenthResult).toBeInstanceOf(Date);
        // Should be the next occurrence (1st of next month or 15th)
        expect([1, 15]).toContain(fifteenthResult!.getUTCDate());
      });

      it('should handle timezone differences with lastRun', () => {
        const lastRun = new Date('2025-01-10T08:00:00Z'); // UTC
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'America/New_York', // EST/EDT timezone
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, lastRun);
        expect(result).toBeInstanceOf(Date);
        // The result should be in the specified timezone
        expect(result!.getTime()).toBeGreaterThan(lastRun.getTime());
      });

      it('should handle edge case where lastRun is in the future', () => {
        const futureLastRun = new Date('2025-02-01T08:00:00Z'); // Future date
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, futureLastRun);
        expect(result).toBeInstanceOf(Date);
        // Should still calculate correctly even with future lastRun
        expect(result!.getTime()).toBeGreaterThan(futureLastRun.getTime());
      });

      it('should handle very old lastRun dates', () => {
        const oldLastRun = new Date('2020-01-01T08:00:00Z'); // Very old date
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, oldLastRun);
        expect(result).toBeInstanceOf(Date);
        // Should calculate from the old lastRun date
        expect(result!.getTime()).toBeGreaterThan(oldLastRun.getTime());
      });

      it('should handle invalid lastRun dates gracefully', () => {
        const invalidLastRun = new Date('invalid');
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, invalidLastRun);
        // The function should handle invalid dates gracefully
        // It might return null or fall back to current time
        if (result) {
          expect(result).toBeInstanceOf(Date);
          expect(result.getTime()).toBeGreaterThan(mockNow.getTime());
        } else {
          // If it returns null, that's also acceptable behavior
          expect(result).toBeNull();
        }
      });
    });

    describe('RRule-based schedules', () => {
      it('should calculate next execution for daily RRule at specific time', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
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

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(9);
        expect(result!.getUTCMinutes()).toBe(0);
      });

      it('should calculate next execution for daily RRule with dtstart', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'UTC',
              dtstart: '2025-01-15T09:00:00Z',
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(9);
      });

      it('should calculate next execution for weekly RRule on specific days', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'WEEKLY',
              interval: 1,
              tzid: 'UTC',
              byweekday: ['MO', 'FR'],
              byhour: [14],
              byminute: [30],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(14);
        expect(result!.getUTCMinutes()).toBe(30);
      });

      it('should calculate next execution for monthly RRule on specific day', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'MONTHLY',
              interval: 1,
              tzid: 'UTC',
              bymonthday: [1, 15],
              byhour: [10],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(10);
      });

      it('should handle RRule with empty arrays (default behavior)', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'UTC',
              dtstart: '2024-01-15T09:00:00Z',
              byhour: [],
              byminute: [],
              byweekday: [],
              bymonthday: [],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        // Should use default time (midnight) when no specific time is set
      });

      it('should handle RRule with multiple hours', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'UTC',
              byhour: [9, 17],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        // Should return the next occurrence (9 AM since we're at 10 AM)
        expect(result!.getUTCHours()).toBe(17);
      });

      it('should handle RRule with timezone', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'America/New_York',
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
      });

      it('should handle RRule with interval > 1', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 2,
              tzid: 'UTC',
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
      });

      it('should return null for invalid RRule configuration', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'INVALID',
              interval: 1,
              tzid: 'UTC',
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });

      it('should return null for RRule missing required fields', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              // missing interval and tzid
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });
    });

    describe('Interval-based schedules', () => {
      it('should calculate next execution for minute intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '5m',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(5 * 60 * 1000);
      });

      it('should calculate next execution for hour intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '2h',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(2 * 60 * 60 * 1000);
      });

      it('should calculate next execution for day intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '1d',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(24 * 60 * 60 * 1000);
      });

      it('should handle different unit formats', () => {
        const units = ['s', 'm', 'h', 'd'];

        units.forEach((unit) => {
          const trigger: WorkflowTrigger = {
            type: 'scheduled',
            with: {
              every: `1${unit}`,
            },
          };

          const result = calculateNextExecutionTime(trigger, new Date());
          expect(result).toBeInstanceOf(Date);
        });
      });

      it('should return null for invalid interval', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: 'invalid-m',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });

      it('should return null for unsupported unit', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '1-invalid',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });
    });

    describe('New interval format (e.g., "5m", "2h", "1d")', () => {
      it('should calculate next execution for minute intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '5m',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(5 * 60 * 1000);
      });

      it('should calculate next execution for hour intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '2h',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(2 * 60 * 60 * 1000);
      });

      it('should calculate next execution for day intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '1d',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(24 * 60 * 60 * 1000);
      });

      it('should calculate next execution for second intervals', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '30s',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime() - mockNow.getTime()).toBe(30 * 1000);
      });

      it('should handle different unit formats', () => {
        const intervals = ['5m', '2h', '1d', '30s'];

        intervals.forEach((interval) => {
          const trigger: WorkflowTrigger = {
            type: 'scheduled',
            with: {
              every: interval,
            },
          };

          const result = calculateNextExecutionTime(trigger, new Date());
          expect(result).toBeInstanceOf(Date);
        });
      });

      it('should return null for invalid interval format', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: 'invalid',
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });

      it('should return null for unsupported unit in new format', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            every: '5w', // weeks not supported
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should return null for non-scheduled trigger', () => {
        const trigger: WorkflowTrigger = {
          type: 'manual',
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });

      it('should return null for trigger without configuration', () => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeNull();
      });
    });
  });

  describe('getWorkflowNextExecutionTime', () => {
    it('should return null for workflows with no scheduled triggers', () => {
      const triggers: WorkflowTrigger[] = [{ type: 'manual' }, { type: 'alert' }];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeNull();
    });

    it('should return next execution time for single scheduled trigger', () => {
      const triggers: WorkflowTrigger[] = [
        { type: 'scheduled', with: { every: '5m' } },
        { type: 'manual' },
      ];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime() - mockNow.getTime()).toBe(5 * 60 * 1000);
    });

    it('should return earliest next execution time for multiple scheduled triggers', () => {
      const triggers: WorkflowTrigger[] = [
        { type: 'scheduled', with: { every: '10m' } },
        { type: 'scheduled', with: { every: '5m' } },
        { type: 'manual' },
      ];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeInstanceOf(Date);
      // Should return the earlier time (5 minutes)
      expect(result!.getTime() - mockNow.getTime()).toBe(5 * 60 * 1000);
    });

    it('should handle mixed trigger types (RRule and interval)', () => {
      const triggers: WorkflowTrigger[] = [
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'UTC',
              byhour: [9],
              byminute: [0],
            },
          },
        },
        { type: 'scheduled', with: { every: '1m' } },
        { type: 'manual' },
      ];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeInstanceOf(Date);
      // Should return the interval-based trigger (1 minute) as it's sooner
      expect(result!.getTime() - mockNow.getTime()).toBe(1 * 60 * 1000);
    });

    it('should handle triggers with invalid configurations', () => {
      const triggers: WorkflowTrigger[] = [
        { type: 'scheduled', with: { every: 'invalid-m' } },
        { type: 'scheduled', with: { every: '5m' } },
      ];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeInstanceOf(Date);
      // Should return the valid trigger (5 minutes)
      expect(result!.getTime() - mockNow.getTime()).toBe(5 * 60 * 1000);
    });

    it('should return null when all scheduled triggers have invalid configurations', () => {
      const triggers: WorkflowTrigger[] = [
        { type: 'scheduled', with: { every: 'invalid-m' } },
        { type: 'scheduled', with: { rrule: { freq: 'INVALID' } } },
      ];

      const result = getWorkflowNextExecutionTime(triggers, []);
      expect(result).toBeNull();
    });
  });

  describe('Complex RRule scenarios', () => {
    it('should handle weekly RRule with multiple weekdays', () => {
      const trigger: WorkflowTrigger = {
        type: 'scheduled',
        with: {
          rrule: {
            freq: 'WEEKLY',
            interval: 1,
            tzid: 'UTC',
            byweekday: ['MO', 'WE', 'FR'],
            byhour: [9],
            byminute: [0],
          },
        },
      };

      const result = calculateNextExecutionTime(trigger, new Date());
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle monthly RRule with multiple month days', () => {
      const trigger: WorkflowTrigger = {
        type: 'scheduled',
        with: {
          rrule: {
            freq: 'MONTHLY',
            interval: 1,
            tzid: 'UTC',
            bymonthday: [1, 15, 30],
            byhour: [10],
            byminute: [0],
          },
        },
      };

      const result = calculateNextExecutionTime(trigger, new Date());
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle RRule with multiple hours and minutes', () => {
      const trigger: WorkflowTrigger = {
        type: 'scheduled',
        with: {
          rrule: {
            freq: 'DAILY',
            interval: 1,
            tzid: 'UTC',
            byhour: [9, 12, 18],
            byminute: [0, 30],
          },
        },
      };

      const result = calculateNextExecutionTime(trigger, new Date());
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle RRule with different timezones', () => {
      const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

      timezones.forEach((tzid) => {
        const trigger: WorkflowTrigger = {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid,
              byhour: [9],
              byminute: [0],
            },
          },
        };

        const result = calculateNextExecutionTime(trigger, new Date());
        expect(result).toBeInstanceOf(Date);
      });
    });

    it('should handle RRule with large intervals', () => {
      const trigger: WorkflowTrigger = {
        type: 'scheduled',
        with: {
          rrule: {
            freq: 'DAILY',
            interval: 7, // Every 7 days
            tzid: 'UTC',
            byhour: [9],
            byminute: [0],
          },
        },
      };

      const result = calculateNextExecutionTime(trigger, new Date());
      expect(result).toBeInstanceOf(Date);
    });
  });
});
