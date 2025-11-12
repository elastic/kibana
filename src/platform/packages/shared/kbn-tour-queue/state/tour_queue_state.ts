/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import { getTourPriority, type TourId } from '..';

const TOUR_SKIP_STORAGE_KEY = 'tourQueue:skipped';

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
  private userProfile?: UserProfileServiceStart;

  constructor() {
    this.loadSkipStateFromLocalStorage();
  }

  private loadSkipStateFromLocalStorage(): void {
    try {
      const skipped = localStorage.getItem(TOUR_SKIP_STORAGE_KEY);
      this.isQueueSkipped = skipped === 'true';
    } catch {
      this.isQueueSkipped = false;
    }
  }

  async initializeTourQueueSkipState(userProfile: UserProfileServiceStart): Promise<void> {
    this.userProfile = userProfile;
    await this.loadSkipStateFromUserProfile();
    this.notifySubscribers();
  }

  async loadSkipStateFromUserProfile(): Promise<void> {
    if (!this.userProfile) return;
    try {
      // If already skipped from localStorage, no need to check user profile
      if (this.isQueueSkipped) {
        return;
      }
      // Check user profile
      const profile = await this.userProfile.getCurrent({
        dataPath: TOUR_SKIP_STORAGE_KEY,
      });
      if (!profile) return;
      this.isQueueSkipped = profile.data?.[TOUR_SKIP_STORAGE_KEY] === true;
    } catch {
      // Silently fail, keep default state
    }
  }

  private async saveSkipState(): Promise<void> {
    try {
      localStorage.setItem(TOUR_SKIP_STORAGE_KEY, 'true');
      if (this.userProfile) {
        await this.userProfile.partialUpdate({ [TOUR_SKIP_STORAGE_KEY]: true });
      }
    } catch {
      // Silently fail
    }
  }

  registerTour(tourId: TourId): () => void {
    const exists = this.registeredTourIds.includes(tourId);
    if (exists) {
      return () => {}; // Return no-op if already exists
    }

    // Sort by priority (lower number = higher priority = shown first)
    this.registeredTourIds = [...this.registeredTourIds, tourId].sort(
      (a, b) => getTourPriority(a) - getTourPriority(b)
    );
    this.notifySubscribers();

    return () => {
      this.registeredTourIds = this.registeredTourIds.filter(
        (registeredTourId) => registeredTourId !== tourId
      );
      this.notifySubscribers();
    };
  }

  getActiveTour(): TourId | null {
    if (this.isQueueSkipped) {
      return null;
    }

    // Find the first tour (by priority) that hasn't been completed
    const activeTour = this.registeredTourIds.find(
      (registeredTourId) => !this.completedTourIds.has(registeredTourId)
    );

    return activeTour ?? null;
  }

  shouldShowTour(tourId: TourId): boolean {
    return this.getActiveTour() === tourId;
  }

  completeTour(tourId: TourId): void {
    this.completedTourIds.add(tourId);
    this.notifySubscribers();
  }

  async skipAllTours(): Promise<void> {
    this.isQueueSkipped = true;
    await this.saveSkipState();
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
