/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CloudDetector } from './cloud_detector';
import type { CloudService } from './cloud_service';

describe('CloudDetector', () => {
  const cloudService1 = {
    checkIfService: () => {
      return { isConfirmed: () => false };
    },
  };
  const cloudService2 = {
    checkIfService: () => {
      throw new Error('test: ignore this service');
    },
  };
  const cloudService3 = {
    checkIfService: () => {
      return {
        isConfirmed: () => true,
        toJSON: () => {
          return { name: 'good-match' };
        },
      };
    },
  };
  // this service is theoretically a better match for the current server,
  // but order dictates that it should never be checked (at least until
  // we have some sort of "confidence" metric returned, if we ever run
  // into this problem)
  const cloudService4 = {
    checkIfService: () => {
      return {
        isConfirmed: () => true,
        toJSON: () => {
          return { name: 'better-match' };
        },
      };
    },
  };
  const cloudServices = [
    cloudService1,
    cloudService2,
    cloudService3,
    cloudService4,
  ] as unknown as CloudService[];

  describe('getCloudDetails', () => {
    it('returns undefined by default', () => {
      const detector = new CloudDetector();

      expect(detector.getCloudDetails()).toBe(undefined);
    });
  });

  describe('detectCloudService', () => {
    it('returns first match', async () => {
      const detector = new CloudDetector({ cloudServices });

      expect(detector.getCloudDetails()).toBeUndefined();
      await detector.detectCloudService();
      // note: should never use better-match
      expect(detector.getCloudDetails()).toEqual({ name: 'good-match' });
    });

    it('returns null if none match', async () => {
      const services = [cloudService1, cloudService2] as unknown as CloudService[];

      const detector1 = new CloudDetector({ cloudServices: services });
      await detector1.detectCloudService();
      expect(detector1.getCloudDetails()).toBeNull();

      const detector2 = new CloudDetector({ cloudServices: [] });
      await detector2.detectCloudService();
      expect(detector2.getCloudDetails()).toBeNull();
    });

    // this is already tested above, but this just tests it explicitly
    it('ignores exceptions from cloud services', async () => {
      const services = [cloudService2] as unknown as CloudService[];
      const detector = new CloudDetector({ cloudServices: services });

      await detector.detectCloudService();
      expect(detector.getCloudDetails()).toBeNull();
    });
  });
});
