/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverRuntimeContext, DiscoverRuntimeContext } from './runtime_context';

const RUNTIME_CONTEXT_STORAGE_KEY = 'discover:runtimeContext';
const RUNTIME_CONTEXT_MAX_ENTRIES = 10;

interface RuntimeContextEntry {
  id: string;
  context: DiscoverRuntimeContext;
}

export class RuntimeContextManager {
  constructor(private readonly storage: Storage) {}

  public restoreContext(id?: string): DiscoverRuntimeContext {
    const entries = this.getRuntimeContextEntries();
    const existingIndex = entries.findIndex((e) => e.id === id);

    if (existingIndex === -1) {
      return createDiscoverRuntimeContext();
    }

    const entry = entries[existingIndex];

    entries.splice(existingIndex, 1);
    entries.unshift(entry);

    this.setRuntimeContextEntries(entries);

    return entry.context;
  }

  public persistContext(id: string, context: DiscoverRuntimeContext) {
    const entries = this.getRuntimeContextEntries();
    const existingIndex = entries.findIndex((e) => e.id === id);

    if (existingIndex !== -1) {
      entries.splice(existingIndex, 1);
    }

    entries.unshift({ id, context });

    this.setRuntimeContextEntries(entries);
  }

  private getRuntimeContextEntries(): RuntimeContextEntry[] {
    return this.storage.get(RUNTIME_CONTEXT_STORAGE_KEY) ?? [];
  }

  private setRuntimeContextEntries(entries: RuntimeContextEntry[]) {
    if (entries.length > RUNTIME_CONTEXT_MAX_ENTRIES) {
      entries.splice(RUNTIME_CONTEXT_MAX_ENTRIES);
    }

    try {
      this.storage.set(RUNTIME_CONTEXT_STORAGE_KEY, entries);
    } catch (e) {
      if (e.name === 'QuotaExceededError' && entries.length > 1) {
        entries.pop();
        this.setRuntimeContextEntries(entries);
      } else {
        throw e;
      }
    }
  }
}
