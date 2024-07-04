/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class TaskReporter {
  /**
   * A very simple wrapper around logging. The reason behind this is to avoid
   * calling console.log directly and we can generate a report in the CI
   * later on through this class.
   * @param message Message to log
   */
  public log(message: string) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}
