/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEarsExperimentalConnector } from './ears_experimental_utils';

describe('isEarsExperimentalConnector', () => {
  test('returns true for connector types whose EARS auth is marked experimental', () => {
    // Add future experimental connectors here
  });

  test('returns false for connector types whose EARS auth is stable', () => {
    // Microsoft and Slack connectors have EARS without experimental flag
    expect(isEarsExperimentalConnector('.microsoft_teams')).toBe(false);
    expect(isEarsExperimentalConnector('.slack')).toBe(false);
    expect(isEarsExperimentalConnector('.sharepoint_online')).toBe(false);
    expect(isEarsExperimentalConnector('.google_calendar')).toBe(false);
    expect(isEarsExperimentalConnector('.gmail')).toBe(false);
    expect(isEarsExperimentalConnector('.google_drive')).toBe(false);
  });

  test('returns false for connector types with no EARS auth', () => {
    expect(isEarsExperimentalConnector('.alienvault-otx')).toBe(false);
  });

  test('returns false for unknown connector types', () => {
    expect(isEarsExperimentalConnector('.nonexistent')).toBe(false);
  });
});
