/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EdotBrowserLog } from '../edot_browser/edot_browser_log';

/** A log record or event of EDOT Android or EDOT iOS; observed when it is emitted by default. */
export class EdotReactNativeLog extends EdotBrowserLog {
  /**
   * Sets the observed time apart from the record's time, like the iOS crash reporter, which
   * observes the crash when it happens and emits it on the next launch.
   */
  observedAt(time: number) {
    this.fields.observed_timestamp = time;
    return this;
  }
}
