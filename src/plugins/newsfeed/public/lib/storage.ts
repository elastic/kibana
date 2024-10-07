/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Observable, BehaviorSubject } from 'rxjs';

/**
 * Persistence layer for the newsfeed driver
 */
export class NewsfeedStorage {
  private readonly lastFetchStorageKey: string;
  private readonly readStatusStorageKey: string;
  private readonly unreadStatus$: BehaviorSubject<boolean>;

  constructor(storagePrefix: string) {
    this.lastFetchStorageKey = getStorageKey(storagePrefix, 'lastFetch');
    this.readStatusStorageKey = getStorageKey(storagePrefix, 'readStatus');
    this.unreadStatus$ = new BehaviorSubject<boolean>(anyUnread(this.getReadStatus()));
  }

  getLastFetchTime(): Date | undefined {
    const lastFetchUtc = localStorage.getItem(this.lastFetchStorageKey);
    if (!lastFetchUtc) {
      return undefined;
    }

    return moment(lastFetchUtc, 'x').toDate(); // parse as unix ms timestamp (already is UTC)
  }

  setLastFetchTime(date: Date) {
    localStorage.setItem(this.lastFetchStorageKey, JSON.stringify(date.getTime()));
  }

  setFetchedItems(itemHashes: string[]): boolean {
    const currentReadStatus = this.getReadStatus();

    const newReadStatus: Record<string, boolean> = {};
    itemHashes.forEach((hash) => {
      newReadStatus[hash] = currentReadStatus[hash] ?? false;
    });

    return this.setReadStatus(newReadStatus);
  }

  /**
   * Marks given items as read, and return the overall unread status.
   */
  markItemsAsRead(itemHashes: string[]): boolean {
    const updatedReadStatus = this.getReadStatus();
    itemHashes.forEach((hash) => {
      updatedReadStatus[hash] = true;
    });
    return this.setReadStatus(updatedReadStatus);
  }

  isAnyUnread(): boolean {
    return this.unreadStatus$.value;
  }

  isAnyUnread$(): Observable<boolean> {
    return this.unreadStatus$.asObservable();
  }

  private getReadStatus(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(this.readStatusStorageKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  private setReadStatus(status: Record<string, boolean>) {
    const hasUnread = anyUnread(status);
    this.unreadStatus$.next(anyUnread(status));
    localStorage.setItem(this.readStatusStorageKey, JSON.stringify(status));
    return hasUnread;
  }
}

const anyUnread = (status: Record<string, boolean>): boolean =>
  Object.values(status).some((read) => !read);

/** @internal */
export const getStorageKey = (prefix: string, key: string) => `newsfeed.${prefix}.${key}`;
