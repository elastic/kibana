/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { load as yamlLoad } from 'js-yaml';
import {
  getAgentImageConfig,
  expandAgentQueue,
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

  describe('expandAgentQueue', () => {
    it('returns spot config for default queue', () => {
      const config = expandAgentQueue();

      expect(config).toEqual(
        expect.objectContaining({
          machineType: 'n2-standard-4',
          preemptible: true,
          provider: DEFAULT_AGENT_IMAGE_CONFIG.provider,
        })
      );
    });

    it('returns virt config for virt queue', () => {
      const config = expandAgentQueue('n2-4-virt');

      expect(config).toEqual(
        expect.objectContaining({
          machineType: 'n2-standard-4',
          enableNestedVirtualization: true,
        })
      );
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
    });
  });
});
