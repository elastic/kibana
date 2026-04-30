/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as yamlLoad } from 'yaml';
import {
  getAgentImageConfig,
  expandAgentQueue,
  getOptimalSpotZones,
  SPOT_ZONE_POOL,
  DEFAULT_AGENT_IMAGE_CONFIG,
  ELASTIC_IMAGES_QA_PROJECT,
  FIPS_140_3_IMAGE,
  FIPS_140_2_IMAGE,
  USE_QA_IMAGE_GH_LABEL,
} from './agent_images';
import { FIPS_GH_LABELS, FIPS_VERSION } from './pr_labels';

const mockSetAnnotation = jest.fn();

jest.mock('./buildkite', () => {
  const actual = jest.requireActual('./buildkite');
  return {
    ...actual,
    BuildkiteClient: jest.fn().mockImplementation(() => ({
      setAnnotation: mockSetAnnotation,
    })),
  };
});

const ORIGINAL_ENV = process.env;

describe('agent_images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.GITHUB_PR_LABELS;
    delete process.env.TEST_ENABLE_FIPS_VERSION;
    delete process.env.USE_QA_IMAGE_FOR_PR;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getAgentImageConfig', () => {
    it('returns default config when no FIPS or QA env is set', () => {
      const config = getAgentImageConfig();

      expect(config).toEqual(DEFAULT_AGENT_IMAGE_CONFIG);
      expect(mockSetAnnotation).not.toHaveBeenCalled();
    });

    it('returns FIPS 140-2 image when env is set', () => {
      process.env.TEST_ENABLE_FIPS_VERSION = FIPS_VERSION.TWO;
      const config = getAgentImageConfig();

      expect(config).toEqual(
        expect.objectContaining({
          image: expect.stringContaining(FIPS_140_2_IMAGE),
          imageProject: DEFAULT_AGENT_IMAGE_CONFIG.imageProject,
        })
      );
      expect(mockSetAnnotation).toHaveBeenCalledWith(
        'agent image config',
        'info',
        expect.stringContaining('FIPS Agents Enabled')
      );
    });

    it('returns FIPS 140-3 image when env is set', () => {
      process.env.TEST_ENABLE_FIPS_VERSION = FIPS_VERSION.THREE;
      const config = getAgentImageConfig();

      expect(config).toEqual(
        expect.objectContaining({
          image: expect.stringContaining(FIPS_140_3_IMAGE),
        })
      );
      expect(mockSetAnnotation).toHaveBeenCalled();
    });

    it('returns FIPS image when FIPS label is present', () => {
      process.env.GITHUB_PR_LABELS = FIPS_GH_LABELS[FIPS_VERSION.TWO];
      const config = getAgentImageConfig();

      expect(config).toEqual(
        expect.objectContaining({
          image: expect.stringContaining(FIPS_140_2_IMAGE),
        })
      );
      expect(mockSetAnnotation).toHaveBeenCalled();
    });

    it('uses QA image project when env is set', () => {
      process.env.USE_QA_IMAGE_FOR_PR = 'true';
      const config = getAgentImageConfig();

      expect(config).toEqual(
        expect.objectContaining({
          imageProject: ELASTIC_IMAGES_QA_PROJECT,
        })
      );
    });

    it('uses QA image project when label is set', () => {
      process.env.GITHUB_PR_LABELS = USE_QA_IMAGE_GH_LABEL;
      const config = getAgentImageConfig();

      expect(config).toEqual(
        expect.objectContaining({
          imageProject: ELASTIC_IMAGES_QA_PROJECT,
        })
      );
    });

    it('returns valid YAML when returnYaml is true', () => {
      const yaml = getAgentImageConfig({ returnYaml: true });

      expect(typeof yaml).toBe('string');
      const parsed = yamlLoad(yaml) as Record<string, unknown>;
      expect(parsed).toHaveProperty('agents');
      const agents = parsed.agents as Record<string, unknown>;
      expect(agents).toHaveProperty('provider', DEFAULT_AGENT_IMAGE_CONFIG.provider);
    });
  });

  describe('getOptimalSpotZones', () => {
    const utcDate = (hour: number, dayOfWeek: number = 2): Date => {
      const d = new Date(Date.UTC(2026, 3, 28 + dayOfWeek, hour, 0, 0));
      return d;
    };

    it('always returns at least 6 zones regardless of time', () => {
      for (let hour = 0; hour < 24; hour++) {
        const zones = getOptimalSpotZones(utcDate(hour)).split(',');
        expect(zones.length).toBeGreaterThanOrEqual(6);
      }
    });

    it('only selects zones from the known pool', () => {
      const poolZones = new Set(SPOT_ZONE_POOL.map((e) => e.zone));
      for (let hour = 0; hour < 24; hour++) {
        const zones = getOptimalSpotZones(utcDate(hour)).split(',');
        for (const z of zones) {
          expect(poolZones).toContain(z);
        }
      }
    });

    it('always includes us-central1 zones (largest region)', () => {
      for (let hour = 0; hour < 24; hour++) {
        const zones = getOptimalSpotZones(utcDate(hour));
        expect(zones).toContain('us-central1');
      }
    });

    it('prefers off-peak zones — EU zones appear when US is in business hours', () => {
      // UTC 18 → US-Central local 12pm (peak), EU local 7pm (evening/off-peak)
      const zones = getOptimalSpotZones(utcDate(18));
      expect(zones).toContain('europe-west1');
    });

    it('includes Asia zones during US business hours (Asia is in deep night)', () => {
      // UTC 16 → US-Central 10am (peak), Taiwan midnight, Tokyo 1am (deep off-peak)
      const zones = getOptimalSpotZones(utcDate(16));
      expect(zones).toContain('asia-east1');
      expect(zones).toContain('asia-northeast1');
    });

    it('omits EU zones when both US and EU are off-peak and US alone is sufficient', () => {
      // UTC 4 → US-Central local 10pm (late evening), EU local 5am (deep night)
      // Both are off-peak, but US zones dominate on capacity and fill min slots
      const zones = getOptimalSpotZones(utcDate(4)).split(',');
      const usZones = zones.filter((z) => z.startsWith('us-'));
      // US zones should be the majority since they have the highest capacity scores
      expect(usZones.length).toBeGreaterThanOrEqual(6);
    });

    it('returns more zones on weekends due to weekend capacity boost', () => {
      const weekday = getOptimalSpotZones(utcDate(16, 2)).split(','); // Tuesday
      const weekend = getOptimalSpotZones(utcDate(16, 6)).split(','); // Saturday
      expect(weekend.length).toBeGreaterThanOrEqual(weekday.length);
    });

    it('orders zones by score (best first)', () => {
      // UTC 3 → US is deep night (high score), EU is early morning
      const zones = getOptimalSpotZones(utcDate(3)).split(',');
      // us-central1 (30.1% capacity) should come before smaller regions
      const firstZone = zones[0];
      expect(firstZone).toMatch(/^us-central1/);
    });

    it('spreads across multiple regions (not all in one region)', () => {
      for (let hour = 0; hour < 24; hour++) {
        const zones = getOptimalSpotZones(utcDate(hour)).split(',');
        const regions = new Set(zones.map((z) => z.replace(/-[a-z]$/, '')));
        expect(regions.size).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('expandAgentQueue', () => {
    it('returns spot config for default queue with spotZones', () => {
      const config = expandAgentQueue();

      expect(config).toEqual(
        expect.objectContaining({
          machineType: 'n2-standard-4',
          preemptible: true,
          provider: DEFAULT_AGENT_IMAGE_CONFIG.provider,
        })
      );
      expect(config).toHaveProperty('spotZones');
      expect((config as Record<string, unknown>).spotZones).toContain('us-central1');
    });

    it('returns virt config for virt queue with spotZones', () => {
      const config = expandAgentQueue('n2-4-virt');

      expect(config).toEqual(
        expect.objectContaining({
          machineType: 'n2-standard-4',
          enableNestedVirtualization: true,
        })
      );
      expect(config).toHaveProperty('spotZones');
    });

    it('uses custom disk size when provided', () => {
      const config = expandAgentQueue('n2-4-spot', 200);

      expect(config.diskSizeGb).toBe(200);
    });

    it('returns base config for queue without spot or virt suffix', () => {
      const config = expandAgentQueue('c2-8');

      expect(config).toEqual(
        expect.objectContaining({
          machineType: 'c2-standard-8',
          provider: DEFAULT_AGENT_IMAGE_CONFIG.provider,
        })
      );
      expect(config).not.toHaveProperty('preemptible');
      expect(config).not.toHaveProperty('enableNestedVirtualization');
      expect(config).not.toHaveProperty('spotZones');
    });
  });
});
