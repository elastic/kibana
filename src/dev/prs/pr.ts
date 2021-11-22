/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from '@kbn/dev-utils';

const isNum = (input: string) => {
  return /^\d+$/.test(input);
};

export class Pr {
  static parseInput(input: string) {
    if (!isNum(input)) {
      throw createFlagError(`invalid pr number [${input}], expected a number`);
    }

    return parseInt(input, 10);
  }

  public readonly remoteRef: string;

  constructor(
    public readonly number: number,
    public readonly targetRef: string,
    public readonly owner: string,
    public readonly sourceBranch: string
  ) {
    this.remoteRef = `pull/${this.number}/head`;
  }
}
