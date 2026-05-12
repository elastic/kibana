/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HookHandler } from '@kbn/workflows/server/types';

export class HookHandlerRegistry {
  private readonly handlers = new Map<string, HookHandler[]>();

  public register(triggerId: string, handler: HookHandler): void {
    const existing = this.handlers.get(triggerId);
    if (existing) {
      existing.push(handler);
    } else {
      this.handlers.set(triggerId, [handler]);
    }
  }

  public getHandlers(triggerId: string): HookHandler[] {
    return this.handlers.get(triggerId) ?? [];
  }

  /** Returns true if at least one handler is registered for the trigger. */
  public hasHandlers(triggerId: string): boolean {
    return (this.handlers.get(triggerId)?.length ?? 0) > 0;
  }
}
