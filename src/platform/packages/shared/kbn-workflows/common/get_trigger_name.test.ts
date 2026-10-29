/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTriggerName } from './get_trigger_name';

describe('getTriggerName', () => {
  it('uses the registered title', () => {
    expect(getTriggerName('slack2.message', 'Slack - Message')).toBe('Slack - Message');
  });

  it('uses the built-in label when no title is registered', () => {
    expect(getTriggerName('manual')).toBe('Manual');
    expect(getTriggerName('alert', '   ')).toBe('Alert');
    expect(getTriggerName('scheduled', '')).toBe('Scheduled');
  });

  it('falls back to the type id', () => {
    expect(getTriggerName('unknown.trigger')).toBe('unknown.trigger');
    expect(getTriggerName('')).toBe('');
  });
});
