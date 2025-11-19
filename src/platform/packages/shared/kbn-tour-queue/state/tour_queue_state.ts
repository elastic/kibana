/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOrder, type TourId } from '..';

export interface Tour {
  isActive: () => boolean;
  skip: () => void;
  complete: () => void;
  unregister: () => void;
}

export interface TourQueueState {
  registeredTourIds: TourId[];
  completedTourIds: Set<TourId>;
  isQueueSkipped: boolean;
}

export class TourQueueStateManager {
  private registeredTourIds: TourId[] = [];
  private completedTourIds: Set<TourId> = new Set();
  private isQueueSkipped: boolean = false;
  private subscribers: Set<() => void> = new Set();

  constructor() {}

  register(tourId: TourId): Tour {
    const exists = this.registeredTourIds.includes(tourId);

    if (!exists) {
      this.registeredTourIds = [...this.registeredTourIds, tourId].sort(
        (a, b) => getOrder(a) - getOrder(b)
      );
      this.notifySubscribers();
    }

    return {
      isActive: () => this.isActive(tourId),
      skip: () => {
        this.skipAll();
      },
      complete: () => {
        this.complete(tourId);
      },
      unregister: () => {
        this.unregister(tourId);
      },
    };
  }

  getActive(): TourId | null {
    if (this.isQueueSkipped) {
      return null;
    }

    // Find the first tour that hasn't been completed
    const activeTour = this.registeredTourIds.find(
      (registeredTourId) => !this.completedTourIds.has(registeredTourId)
    );

    return activeTour ?? null;
  }

  isActive(tourId: TourId): boolean {
    return this.getActive() === tourId;
  }

  unregister(tourId: TourId): void {
    this.registeredTourIds = this.registeredTourIds.filter(
      (registeredTourId) => registeredTourId !== tourId
    );
    this.notifySubscribers();
  }

  complete(tourId: TourId): void {
    this.completedTourIds.add(tourId);
    this.notifySubscribers();
  }

  skipAll(): void {
    this.isQueueSkipped = true;
    this.notifySubscribers();
  }

  getState(): TourQueueState {
    return {
      registeredTourIds: [...this.registeredTourIds],
      completedTourIds: new Set(this.completedTourIds),
      isQueueSkipped: this.isQueueSkipped,
    };
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}
