/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type StepFactory = () => {
  run(scopeId: string, input: unknown, context: unknown): Promise<unknown>;
};

export class DemoCatalog {
  constructor(private readonly steps: ReadonlyMap<string, StepFactory>) {}

  async run(stepType: string, scopeId: string, input: unknown): Promise<unknown> {
    const create = this.steps.get(stepType);
    if (!create) {
      throw new Error(
        `Unsupported remote step type "${stepType}". Experimental remote execution only runs registered steps.`
      );
    }
    return create().run(scopeId, input, undefined);
  }
}
