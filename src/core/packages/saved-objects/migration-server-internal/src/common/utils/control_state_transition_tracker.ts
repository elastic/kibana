/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

class ControlStateTransitionTracker {
  readonly #transitions: [from: string, to: string, tookMs: number][] = [];

  observeTransition(from: string, to: string, tookMs: number): void {
    this.#transitions.push([from, to, tookMs]);
  }

  public get length() {
    return this.#transitions.length;
  }

  public pretty(): string {
    if (this.#transitions.length === 0) {
      return '[<No transitions observed>]';
    }

    const transitions = this.#transitions.map(
      ([from, to, tookMs]) => `${from} -> ${to} (${tookMs}ms)`
    );

    return `[\n  ${transitions.join('\n  ')}\n]`;
  }
}

export function createControlStateTransitionTracker(): ControlStateTransitionTracker {
  return new ControlStateTransitionTracker();
}
