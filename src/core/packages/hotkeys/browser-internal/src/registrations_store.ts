/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';

/**
 * In-memory registry of the Kibana-level {@link HotkeyDefinition}s currently
 * bound to the shared `HotkeyManager`. Acts as the source of truth for
 * discovery UIs so we never depend on `@tanstack/hotkeys` metadata survival
 * nor leak TanStack-specific types out of the service.
 *
 * @internal
 */
export class RegistrationsStore {
  private readonly defs = new Map<string, HotkeyDefinition>();
  private readonly subject = new BehaviorSubject<ReadonlyArray<HotkeyDefinition>>([]);

  public has(id: string): boolean {
    return this.defs.has(id);
  }

  public get(id: string): HotkeyDefinition | undefined {
    return this.defs.get(id);
  }

  public set(def: HotkeyDefinition): void {
    this.defs.set(def.id, def);
    this.emit();
  }

  public remove(id: string): void {
    if (this.defs.delete(id)) {
      this.emit();
    }
  }

  public asObservable(): Observable<ReadonlyArray<HotkeyDefinition>> {
    return this.subject.asObservable();
  }

  public dispose(): void {
    this.defs.clear();
    this.subject.next([]);
    this.subject.complete();
  }

  private emit(): void {
    this.subject.next(Array.from(this.defs.values()));
  }
}
