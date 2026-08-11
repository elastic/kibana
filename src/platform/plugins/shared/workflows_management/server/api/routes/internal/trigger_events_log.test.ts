/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { triggerEventsLogSearchBodySchema } from './trigger_events_log';
import {
  MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH,
  MAX_TRIGGER_EVENT_SEARCH_TIME_STRING_LENGTH,
} from '../utils/route_constants';

describe('triggerEventsLogSearchBodySchema', () => {
  it('accepts typical search payloads', () => {
    expect(
      triggerEventsLogSearchBodySchema.validate({
        kql: 'triggerId : workflows.failed',
        from: 'now-15m',
        to: 'now',
        page: 1,
        size: 50,
      })
    ).toEqual({
      kql: 'triggerId : workflows.failed',
      from: 'now-15m',
      to: 'now',
      page: 1,
      size: 50,
    });
  });

  it('rejects oversized KQL strings', () => {
    expect(() =>
      triggerEventsLogSearchBodySchema.validate({
        kql: 'a'.repeat(MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH + 1),
      })
    ).toThrow(`must have a maximum length of [${MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH}]`);
  });

  it('rejects oversized from timestamps', () => {
    expect(() =>
      triggerEventsLogSearchBodySchema.validate({
        from: 'x'.repeat(MAX_TRIGGER_EVENT_SEARCH_TIME_STRING_LENGTH + 1),
      })
    ).toThrow(`must have a maximum length of [${MAX_TRIGGER_EVENT_SEARCH_TIME_STRING_LENGTH}]`);
  });

  it('rejects oversized to timestamps', () => {
    expect(() =>
      triggerEventsLogSearchBodySchema.validate({
        to: 'x'.repeat(MAX_TRIGGER_EVENT_SEARCH_TIME_STRING_LENGTH + 1),
      })
    ).toThrow(`must have a maximum length of [${MAX_TRIGGER_EVENT_SEARCH_TIME_STRING_LENGTH}]`);
  });
});
