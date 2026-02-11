/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GoogleCalendar } from './google_calendar';

describe('GoogleCalendar', () => {
  it('should be defined', () => {
    expect(GoogleCalendar).toBeDefined();
  });

  it('should have the correct metadata', () => {
    expect(GoogleCalendar.metadata.id).toBe('.google_calendar');
    expect(GoogleCalendar.metadata.displayName).toBe('Google Calendar');
    expect(GoogleCalendar.metadata.minimumLicense).toBe('enterprise');
    expect(GoogleCalendar.metadata.supportedFeatureIds).toContain('workflows');
  });

  it('should use bearer auth', () => {
    expect(GoogleCalendar.auth?.types).toContain('bearer');
  });

  it('should define searchEvents action', () => {
    expect(GoogleCalendar.actions.searchEvents).toBeDefined();
    expect(GoogleCalendar.actions.searchEvents.isTool).toBe(true);
  });

  it('should define getEvent action', () => {
    expect(GoogleCalendar.actions.getEvent).toBeDefined();
    expect(GoogleCalendar.actions.getEvent.isTool).toBe(true);
  });

  it('should define listCalendars action', () => {
    expect(GoogleCalendar.actions.listCalendars).toBeDefined();
    expect(GoogleCalendar.actions.listCalendars.isTool).toBe(true);
  });

  it('should define listEvents action', () => {
    expect(GoogleCalendar.actions.listEvents).toBeDefined();
    expect(GoogleCalendar.actions.listEvents.isTool).toBe(true);
  });

  it('should have a test handler', () => {
    expect(GoogleCalendar.test).toBeDefined();
    expect(GoogleCalendar.test?.handler).toBeInstanceOf(Function);
  });
});
