/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { Storage } from '@kbn/kibana-utils-plugin/public';

import { spacesService } from './kibana_services';

/**
 * Storage keys for attachment IDs
 */
const ATTACHMENT_LOCAL_STORAGE_KEY = 'dashboardAttachments';
const ATTACHMENT_SESSION_STORAGE_KEY = 'dashboardAttachmentsSession';
export const DASHBOARD_UNSAVED_ATTACHMENT_ID = 'unsaved';

/**
 * Stale entry cleanup threshold (7 days in milliseconds)
 */
const STALE_ENTRY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredAttachment {
  attachmentId: string;
  lastAccessed: number;
}

interface DashboardAttachmentServiceType {
  /**
   * Get the attachment ID for a dashboard.
   * For saved dashboards, uses localStorage (persists across sessions).
   * For unsaved dashboards, uses sessionStorage (persists only for session).
   *
   * @param savedObjectId - The saved object ID if the dashboard is saved, undefined otherwise
   * @param urlAttachmentId - Optional attachment ID from URL (agent navigation), takes precedence
   * @returns The attachment ID for the dashboard
   */
  getAttachmentId: (savedObjectId: string | undefined, urlAttachmentId?: string) => string;

  /**
   * Migrate an unsaved dashboard's attachment ID to localStorage when it gets saved.
   * This preserves conversation continuity through the save operation.
   *
   * @param newSavedObjectId - The new saved object ID for the dashboard
   */
  migrateUnsavedToSaved: (newSavedObjectId: string) => void;

  /**
   * Clear the attachment ID for a dashboard.
   * Call this when a dashboard is deleted.
   *
   * @param savedObjectId - The saved object ID of the dashboard to clear, or undefined for unsaved
   */
  clearAttachmentId: (savedObjectId?: string) => void;
}

class DashboardAttachmentService implements DashboardAttachmentServiceType {
  private activeSpaceId: string;
  private sessionStorage: Storage;
  private localStorage: Storage;

  constructor() {
    this.sessionStorage = new Storage(sessionStorage);
    this.localStorage = new Storage(localStorage);

    this.activeSpaceId = 'default';
    if (spacesService) {
      firstValueFrom(spacesService.getActiveSpace$()).then((space) => {
        this.activeSpaceId = space.id;
      });
    }

    // Clean up stale entries on service initialization
    this.cleanupStaleEntries();
  }

  public getAttachmentId(savedObjectId: string | undefined, urlAttachmentId?: string): string {
    // Priority 1: URL attachment ID from agent navigation
    if (urlAttachmentId) {
      // Store it for future reloads
      this.storeAttachmentId(savedObjectId, urlAttachmentId);
      return urlAttachmentId;
    }

    // Priority 2: Lookup from storage
    const storedId = this.lookupAttachmentId(savedObjectId);
    if (storedId) {
      // Update lastAccessed time
      this.storeAttachmentId(savedObjectId, storedId);
      return storedId;
    }

    // Priority 3: Generate new ID
    // For saved dashboards, use savedObjectId as attachmentId (stable across sessions)
    // For unsaved dashboards, generate a random UUID
    const newAttachmentId = savedObjectId ?? this.generateRandomId();
    this.storeAttachmentId(savedObjectId, newAttachmentId);
    return newAttachmentId;
  }

  public migrateUnsavedToSaved(newSavedObjectId: string): void {
    try {
      // Get attachment ID from session storage (unsaved dashboard)
      const unsavedAttachmentId = this.getFromSessionStorage(DASHBOARD_UNSAVED_ATTACHMENT_ID);

      if (unsavedAttachmentId) {
        // Store in localStorage with the new saved object ID
        this.setInLocalStorage(newSavedObjectId, unsavedAttachmentId);
        // Clear the session storage entry
        this.clearFromSessionStorage(DASHBOARD_UNSAVED_ATTACHMENT_ID);
      }
    } catch (e) {
      // Silently fail
      // eslint-disable-next-line no-console
      console.warn('Failed to migrate unsaved dashboard attachment ID:', e);
    }
  }

  public clearAttachmentId(savedObjectId?: string): void {
    try {
      if (savedObjectId) {
        this.clearFromLocalStorage(savedObjectId);
      } else {
        this.clearFromSessionStorage(DASHBOARD_UNSAVED_ATTACHMENT_ID);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to clear attachment ID:', e);
    }
  }

  private lookupAttachmentId(savedObjectId: string | undefined): string | undefined {
    if (savedObjectId) {
      return this.getFromLocalStorage(savedObjectId);
    }
    return this.getFromSessionStorage(DASHBOARD_UNSAVED_ATTACHMENT_ID);
  }

  private storeAttachmentId(savedObjectId: string | undefined, attachmentId: string): void {
    try {
      if (savedObjectId) {
        this.setInLocalStorage(savedObjectId, attachmentId);
      } else {
        this.setInSessionStorage(DASHBOARD_UNSAVED_ATTACHMENT_ID, attachmentId);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to store attachment ID:', e);
    }
  }

  private getFromLocalStorage(dashboardId: string): string | undefined {
    try {
      const allSpaces = this.localStorage.get(ATTACHMENT_LOCAL_STORAGE_KEY) ?? {};
      const spaceData = allSpaces[this.activeSpaceId] ?? {};
      const entry = spaceData[dashboardId] as StoredAttachment | undefined;
      return entry?.attachmentId;
    } catch (e) {
      return undefined;
    }
  }

  private setInLocalStorage(dashboardId: string, attachmentId: string): void {
    const allSpaces = this.localStorage.get(ATTACHMENT_LOCAL_STORAGE_KEY) ?? {};
    const spaceData = allSpaces[this.activeSpaceId] ?? {};

    spaceData[dashboardId] = {
      attachmentId,
      lastAccessed: Date.now(),
    } as StoredAttachment;

    this.localStorage.set(ATTACHMENT_LOCAL_STORAGE_KEY, {
      ...allSpaces,
      [this.activeSpaceId]: spaceData,
    });
  }

  private clearFromLocalStorage(dashboardId: string): void {
    const allSpaces = this.localStorage.get(ATTACHMENT_LOCAL_STORAGE_KEY) ?? {};
    const spaceData = allSpaces[this.activeSpaceId] ?? {};

    if (spaceData[dashboardId]) {
      delete spaceData[dashboardId];
      this.localStorage.set(ATTACHMENT_LOCAL_STORAGE_KEY, {
        ...allSpaces,
        [this.activeSpaceId]: spaceData,
      });
    }
  }

  private getFromSessionStorage(key: string): string | undefined {
    try {
      const allSpaces = this.sessionStorage.get(ATTACHMENT_SESSION_STORAGE_KEY) ?? {};
      const spaceData = allSpaces[this.activeSpaceId] ?? {};
      return spaceData[key];
    } catch (e) {
      return undefined;
    }
  }

  private setInSessionStorage(key: string, attachmentId: string): void {
    const allSpaces = this.sessionStorage.get(ATTACHMENT_SESSION_STORAGE_KEY) ?? {};
    const spaceData = allSpaces[this.activeSpaceId] ?? {};

    spaceData[key] = attachmentId;

    this.sessionStorage.set(ATTACHMENT_SESSION_STORAGE_KEY, {
      ...allSpaces,
      [this.activeSpaceId]: spaceData,
    });
  }

  private clearFromSessionStorage(key: string): void {
    const allSpaces = this.sessionStorage.get(ATTACHMENT_SESSION_STORAGE_KEY) ?? {};
    const spaceData = allSpaces[this.activeSpaceId] ?? {};

    if (spaceData[key]) {
      delete spaceData[key];
      this.sessionStorage.set(ATTACHMENT_SESSION_STORAGE_KEY, {
        ...allSpaces,
        [this.activeSpaceId]: spaceData,
      });
    }
  }

  private generateRandomId(): string {
    return uuidv4();
  }

  /**
   * Clean up localStorage entries that haven't been accessed recently.
   * This prevents unbounded growth of localStorage from deleted dashboards.
   */
  private cleanupStaleEntries(): void {
    try {
      const allSpaces = this.localStorage.get(ATTACHMENT_LOCAL_STORAGE_KEY) ?? {};
      const now = Date.now();
      let modified = false;

      for (const spaceId of Object.keys(allSpaces)) {
        const spaceData = allSpaces[spaceId] ?? {};
        for (const dashboardId of Object.keys(spaceData)) {
          const entry = spaceData[dashboardId] as StoredAttachment;
          if (entry?.lastAccessed && now - entry.lastAccessed > STALE_ENTRY_THRESHOLD_MS) {
            delete spaceData[dashboardId];
            modified = true;
          }
        }
      }

      if (modified) {
        this.localStorage.set(ATTACHMENT_LOCAL_STORAGE_KEY, allSpaces);
      }
    } catch (e) {
      // Silently fail cleanup - non-critical operation
    }
  }
}

let dashboardAttachmentService: DashboardAttachmentService;

export const getDashboardAttachmentService = () => {
  if (!dashboardAttachmentService) {
    dashboardAttachmentService = new DashboardAttachmentService();
  }
  return dashboardAttachmentService;
};
