/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatForDisplay, type RegisterableHotkey } from '@tanstack/hotkeys';

export interface FormatChordOptions {
  /**
   * Override the detected platform. Primarily for tests and storybook where
   * auto-detection would otherwise depend on the host machine.
   */
  platform?: 'mac' | 'windows' | 'linux';
}

/**
 * Formats a `@tanstack/hotkeys` chord for display in the cheat sheet.
 *
 * Thin wrapper around `formatForDisplay` that exists so call sites don't need
 * to take a direct dependency on the upstream module and so tests can force a
 * platform without stubbing `navigator`.
 */
export const formatChord = (
  keys: RegisterableHotkey | (string & {}),
  { platform }: FormatChordOptions = {}
): string => formatForDisplay(keys, platform ? { platform } : {});
