/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tiersConfigSchema } from './pricing_tiers_config';

describe('pricing_tiers_config', () => {
  describe('tiersConfigSchema', () => {
    const serverlessContext = { serverless: true };
    const traditionalContext = { serverless: false };

    it('should validate a valid config with single product in serverless', () => {
      const validConfig = {
        enabled: true,
        products: [{ name: 'observability', tier: 'complete' }],
      };

      expect(() => tiersConfigSchema.validate(validConfig, serverlessContext)).not.toThrow();
    });

    it('should validate a valid config with multiple products having same tier in serverless', () => {
      const validConfig = {
        enabled: true,
        products: [
          { name: 'security', tier: 'complete' },
          { name: 'endpoint', tier: 'complete' },
          { name: 'cloud', tier: 'complete' },
        ],
      };

      expect(() => tiersConfigSchema.validate(validConfig, serverlessContext)).not.toThrow();
    });

    it('should validate a config with no products', () => {
      const validConfig = {
        enabled: false,
        products: [],
      };

      expect(() => tiersConfigSchema.validate(validConfig, serverlessContext)).not.toThrow();
      expect(() => tiersConfigSchema.validate(validConfig, traditionalContext)).not.toThrow();
    });

    it('should validate a config with undefined products', () => {
      const validConfig = {
        enabled: false,
      };

      expect(() => tiersConfigSchema.validate(validConfig, serverlessContext)).not.toThrow();
      expect(() => tiersConfigSchema.validate(validConfig, traditionalContext)).not.toThrow();
    });

    it('should reject config with multiple products having different tiers', () => {
      const invalidConfig = {
        enabled: true,
        products: [
          { name: 'security', tier: 'complete' },
          { name: 'endpoint', tier: 'essentials' }, // Different tier
          { name: 'cloud', tier: 'complete' },
        ],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow(
        'All products must have the same tier'
      );
    });

    it('should reject config with observability and security products having different tiers', () => {
      const invalidConfig = {
        enabled: true,
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'essentials' }, // Different tier
        ],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow(
        'Invalid pricing configuration: All products must have the same tier'
      );
    });

    it('should reject config with mixed observability and security products even with same tier', () => {
      const invalidConfig = {
        enabled: true,
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'complete' }, // Same tier but different product types
        ],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow(
        'Cannot mix observability and security products in the same configuration'
      );
    });

    it('should reject config with observability and security products (different product types)', () => {
      // This test shows that even if we hypothetically had matching tiers,
      // mixing observability and security products should be rejected
      const invalidConfig = {
        enabled: true,
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'complete' }, // Same tier but different product types
        ],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow(
        'Cannot mix observability and security products in the same configuration'
      );
    });

    it('should reject config with mixed security products having different tiers', () => {
      const invalidConfig = {
        enabled: true,
        products: [
          { name: 'ai_soc', tier: 'search_ai_lake' },
          { name: 'endpoint', tier: 'complete' }, // Different tier
          { name: 'security', tier: 'essentials' }, // Different tier
        ],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow(
        'All products must have the same tier'
      );
    });

    it('should accept valid observability configurations', () => {
      const observabilityComplete = {
        enabled: true,
        products: [{ name: 'observability', tier: 'complete' }],
      };

      const observabilityLogsEssentials = {
        enabled: true,
        products: [{ name: 'observability', tier: 'logs_essentials' }],
      };

      expect(() =>
        tiersConfigSchema.validate(observabilityComplete, serverlessContext)
      ).not.toThrow();
      expect(() =>
        tiersConfigSchema.validate(observabilityLogsEssentials, serverlessContext)
      ).not.toThrow();
    });

    it('should accept valid security product configurations', () => {
      const securityComplete = {
        enabled: true,
        products: [
          { name: 'security', tier: 'complete' },
          { name: 'endpoint', tier: 'complete' },
          { name: 'cloud', tier: 'complete' },
        ],
      };

      const securityEssentials = {
        enabled: true,
        products: [
          { name: 'security', tier: 'essentials' },
          { name: 'endpoint', tier: 'essentials' },
        ],
      };

      const aiSocSearchAiLake = {
        enabled: true,
        products: [{ name: 'ai_soc', tier: 'search_ai_lake' }],
      };

      expect(() => tiersConfigSchema.validate(securityComplete, serverlessContext)).not.toThrow();
      expect(() => tiersConfigSchema.validate(securityEssentials, serverlessContext)).not.toThrow();
      expect(() => tiersConfigSchema.validate(aiSocSearchAiLake, serverlessContext)).not.toThrow();
    });

    it('should reject invalid product names', () => {
      const invalidConfig = {
        enabled: true,
        products: [{ name: 'invalid_product', tier: 'complete' }],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow();
    });

    it('should reject invalid tier names', () => {
      const invalidConfig = {
        enabled: true,
        products: [{ name: 'security', tier: 'invalid_tier' }],
      };

      expect(() => tiersConfigSchema.validate(invalidConfig, serverlessContext)).toThrow();
    });

    it('should enforce enabled=false in traditional deployments', () => {
      const configWithEnabledTrue = {
        enabled: true,
        products: [{ name: 'observability', tier: 'complete' }],
      };

      expect(() => tiersConfigSchema.validate(configWithEnabledTrue, traditionalContext)).toThrow(
        '[enabled]: expected value to equal [false]'
      );
    });

    it('should allow enabled=false in traditional deployments', () => {
      const configWithEnabledFalse = {
        enabled: false,
        products: [],
      };

      expect(() =>
        tiersConfigSchema.validate(configWithEnabledFalse, traditionalContext)
      ).not.toThrow();
    });
  });
});
