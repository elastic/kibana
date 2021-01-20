/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Formats } from './core/formats';

export interface Translation {
  /**
   * Actual translated messages.
   */
  messages: Record<string, string>;
  /**
   * Locale of the translated messages.
   */
  locale?: string;
  /**
   * Set of options to the underlying formatter.
   */
  formats?: Formats;
}
