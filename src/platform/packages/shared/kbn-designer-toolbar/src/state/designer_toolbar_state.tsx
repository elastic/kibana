/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

export interface DesignerToolbarItem {
  id: string;
  children: ReactNode;
  priority?: number;
}

export class DesignerToolbarStateManager {
  private items: DesignerToolbarItem[] = [];
  private subscribers: Set<() => void> = new Set();

  public registerItem(item: DesignerToolbarItem): () => void {
    const exists = this.items.some((i) => i.id === item.id);
    if (exists) {
      return () => {};
    }

    this.items = [...this.items, item].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.notifySubscribers();

    return () => {
      this.items = this.items.filter((i) => i.id !== item.id);
      this.notifySubscribers();
    };
  }

  public getItems(): DesignerToolbarItem[] {
    return this.items;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}
