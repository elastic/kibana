/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock storage that tracks localStorage vs sessionStorage instances
const mockStorageData: {
  local: Record<string, unknown>;
  session: Record<string, unknown>;
} = {
  local: {},
  session: {},
};

// Mock the kibana-utils-plugin Storage class
jest.mock('@kbn/kibana-utils-plugin/public', () => {
  // Counter to determine which instance is which (session is created first, then local in the service)
  let instanceIndex = 0;

  return {
    Storage: jest.fn().mockImplementation(() => {
      // First instance (index 0) is sessionStorage, second (index 1) is localStorage
      const storageType = instanceIndex === 0 ? 'session' : 'local';
      instanceIndex++;

      return {
        get: (key: string) => mockStorageData[storageType][key] ?? null,
        set: (key: string, value: unknown) => {
          mockStorageData[storageType][key] = value;
        },
        remove: (key: string) => {
          delete mockStorageData[storageType][key];
        },
      };
    }),
  };
});

jest.mock('./kibana_services', () => ({
  spacesService: undefined,
}));

import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import {
  getDashboardAttachmentService,
  DASHBOARD_UNSAVED_ATTACHMENT_ID,
} from './dashboard_attachment_service';

describe('DashboardAttachmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset storage data
    mockStorageData.local = {};
    mockStorageData.session = {};
  });

  describe('getAttachmentId', () => {
    it('should return URL attachment ID when provided and store it', () => {
      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId('saved-123', 'url-attachment-id');

      expect(result).toBe('url-attachment-id');
      // Should be stored in localStorage for saved dashboards
      expect(mockStorageData.local).toHaveProperty('dashboardAttachments');
    });

    it('should return stored attachment ID for saved dashboard', () => {
      // Pre-populate localStorage
      mockStorageData.local.dashboardAttachments = {
        default: {
          'saved-123': {
            attachmentId: 'stored-attachment-id',
            lastAccessed: Date.now(),
          },
        },
      };

      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId('saved-123');

      expect(result).toBe('stored-attachment-id');
    });

    it('should generate and store new attachment ID for saved dashboard without stored ID', () => {
      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId('saved-456');

      // For saved dashboards, uses savedObjectId as attachmentId
      expect(result).toBe('saved-456');
      expect(mockStorageData.local.dashboardAttachments).toEqual({
        default: {
          'saved-456': {
            attachmentId: 'saved-456',
            lastAccessed: expect.any(Number),
          },
        },
      });
    });

    it('should return stored attachment ID for unsaved dashboard', () => {
      // Pre-populate sessionStorage
      mockStorageData.session.dashboardAttachmentsSession = {
        default: {
          [DASHBOARD_UNSAVED_ATTACHMENT_ID]: 'unsaved-attachment-id',
        },
      };

      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId(undefined);

      expect(result).toBe('unsaved-attachment-id');
    });

    it('should generate random attachment ID for unsaved dashboard without stored ID', () => {
      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId(undefined);

      // Should be a valid UUID v4
      expect(uuidValidate(result)).toBe(true);
      expect(uuidVersion(result)).toBe(4);
      expect(mockStorageData.session.dashboardAttachmentsSession).toEqual({
        default: {
          [DASHBOARD_UNSAVED_ATTACHMENT_ID]: result,
        },
      });
    });

    it('should use URL attachment ID over stored ID', () => {
      // Pre-populate localStorage with a different ID
      mockStorageData.local.dashboardAttachments = {
        default: {
          'saved-123': {
            attachmentId: 'old-stored-id',
            lastAccessed: Date.now(),
          },
        },
      };

      const service = getDashboardAttachmentService();
      const result = service.getAttachmentId('saved-123', 'new-url-attachment-id');

      expect(result).toBe('new-url-attachment-id');
      // Should update storage with the new ID
      expect(
        (mockStorageData.local.dashboardAttachments as Record<string, Record<string, unknown>>)
          .default['saved-123']
      ).toMatchObject({
        attachmentId: 'new-url-attachment-id',
      });
    });
  });

  describe('migrateUnsavedToSaved', () => {
    it('should migrate attachment ID from session to local storage', () => {
      // Pre-populate sessionStorage with unsaved dashboard attachment
      mockStorageData.session.dashboardAttachmentsSession = {
        default: {
          [DASHBOARD_UNSAVED_ATTACHMENT_ID]: 'migrating-attachment-id',
        },
      };

      const service = getDashboardAttachmentService();
      service.migrateUnsavedToSaved('new-saved-id');

      // Should be stored in localStorage
      expect(mockStorageData.local.dashboardAttachments).toEqual({
        default: {
          'new-saved-id': {
            attachmentId: 'migrating-attachment-id',
            lastAccessed: expect.any(Number),
          },
        },
      });

      // Should be cleared from sessionStorage
      expect(
        (
          mockStorageData.session.dashboardAttachmentsSession as Record<
            string,
            Record<string, unknown>
          >
        ).default[DASHBOARD_UNSAVED_ATTACHMENT_ID]
      ).toBeUndefined();
    });

    it('should do nothing if no unsaved attachment exists', () => {
      mockStorageData.session.dashboardAttachmentsSession = {
        default: {},
      };

      const service = getDashboardAttachmentService();
      service.migrateUnsavedToSaved('new-saved-id');

      // Should not create localStorage entry
      expect(mockStorageData.local.dashboardAttachments).toBeUndefined();
    });
  });

  describe('clearAttachmentId', () => {
    it('should clear attachment ID from localStorage for saved dashboard', () => {
      mockStorageData.local.dashboardAttachments = {
        default: {
          'saved-123': {
            attachmentId: 'to-be-cleared',
            lastAccessed: Date.now(),
          },
        },
      };

      const service = getDashboardAttachmentService();
      service.clearAttachmentId('saved-123');

      expect(
        (mockStorageData.local.dashboardAttachments as Record<string, Record<string, unknown>>)
          .default['saved-123']
      ).toBeUndefined();
    });

    it('should clear attachment ID from sessionStorage for unsaved dashboard', () => {
      mockStorageData.session.dashboardAttachmentsSession = {
        default: {
          [DASHBOARD_UNSAVED_ATTACHMENT_ID]: 'to-be-cleared',
        },
      };

      const service = getDashboardAttachmentService();
      service.clearAttachmentId();

      expect(
        (
          mockStorageData.session.dashboardAttachmentsSession as Record<
            string,
            Record<string, unknown>
          >
        ).default[DASHBOARD_UNSAVED_ATTACHMENT_ID]
      ).toBeUndefined();
    });
  });
});
