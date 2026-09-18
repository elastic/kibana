/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class CheckResult {
  constructor(checkName) {
    this.checkName = checkName;
    this.errors = [];
    this.succeeded = true;
  }

  addError(error) {
    this.succeeded = false;
    this.errors.push(error);
  }

  toString() {
    if (this.succeeded) {
      return `✓ ${this.checkName}: Passed`;
    } else {
      return [`✗ ${this.checkName}: Failed`, ...this.errors.map((err) => `  - ${err}`)].join('\n');
    }
  }
}

export class PrecommitCheck {
  constructor(name) {
    this.name = name;
  }

  async execute() {
    throw new Error('execute() must be implemented by check class');
  }

  shouldExecute() {
    return true;
  }

  async runSafely(log, files, options) {
    const result = new CheckResult(this.name);
    try {
      await this.execute(log, files, options);
    } catch (error) {
      if (error.errors) {
        error.errors.forEach((err) => result.addError(err.message || err.toString()));
      } else {
        result.addError(error.message || error.toString());
      }
    }
    return result;
  }
}
