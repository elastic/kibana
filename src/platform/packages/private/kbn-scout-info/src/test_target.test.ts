/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTargetDomain } from './test_target';
import {
  ScoutTargetDomainSchema,
  ScoutTestTarget,
  VALID_SCOUT_TEST_TARGET_DEFINITIONS,
  testTargets,
} from './test_target';

describe('ScoutTestTarget', () => {
  describe('constructor', () => {
    it('accepts valid location, arch, and domain', () => {
      const target = new ScoutTestTarget('local', 'stateful', 'classic');
      expect(target.location).toBe('local');
      expect(target.arch).toBe('stateful');
      expect(target.domain).toBe('classic');
    });

    it('throws with invalid location', () => {
      expect(() => new ScoutTestTarget('invalid', 'stateful', 'classic')).toThrow(
        /Scout test target validation discovered/
      );
    });

    it('throws with invalid arch', () => {
      expect(() => new ScoutTestTarget('local', 'invalid', 'classic')).toThrow(
        /Scout test target validation discovered/
      );
    });

    it('throws with invalid domain', () => {
      expect(() => new ScoutTestTarget('local', 'stateful', 'invalid')).toThrow(
        /Scout test target validation discovered/
      );
    });
  });

  describe('tag getters', () => {
    it('tagWithoutLocation returns arch-domain', () => {
      const target = new ScoutTestTarget('local', 'serverless', 'search');
      expect(target.tagWithoutLocation).toBe('serverless-search');
    });

    it('tag returns location-arch-domain', () => {
      const target = new ScoutTestTarget('cloud', 'stateful', 'classic');
      expect(target.tag).toBe('cloud-stateful-classic');
    });

    it('playwrightTag returns @ plus tag', () => {
      const target = new ScoutTestTarget('local', 'serverless', 'security_complete');
      expect(target.playwrightTag).toBe('@local-serverless-security_complete');
    });
  });

  describe('fromTag', () => {
    it('parses valid tag and returns ScoutTestTarget', () => {
      const target = ScoutTestTarget.fromTag('local-stateful-classic');
      expect(target.location).toBe('local');
      expect(target.arch).toBe('stateful');
      expect(target.domain).toBe('classic');
      expect(target.tag).toBe('local-stateful-classic');
    });

    it('parses serverless domain with underscore', () => {
      const target = ScoutTestTarget.fromTag('cloud-serverless-observability_logs_essentials');
      expect(target.location).toBe('cloud');
      expect(target.arch).toBe('serverless');
      expect(target.domain).toBe('observability_logs_essentials');
    });

    it('throws when tag does not match pattern', () => {
      expect(() => ScoutTestTarget.fromTag('invalid')).toThrow(
        /Failed to parse Scout test target from tag 'invalid'/
      );
    });

    it('throws when parsed values fail schema validation', () => {
      expect(() => ScoutTestTarget.fromTag('local-invalid-classic')).toThrow(
        /Scout test target validation discovered/
      );
    });
  });

  describe('fromPlaywrightTag', () => {
    it('parses tag with leading @', () => {
      const target = ScoutTestTarget.fromPlaywrightTag('@local-serverless-search');
      expect(target.tag).toBe('local-serverless-search');
    });

    it('throws when tag does not start with @', () => {
      expect(() => ScoutTestTarget.fromPlaywrightTag('local-serverless-search')).toThrow(
        /expected tag to start with @/
      );
    });
  });

  describe('tryFromEnv', () => {
    it('does not throw when env vars are missing or invalid', () => {
      delete process.env.SCOUT_TARGET_LOCATION;
      delete process.env.SCOUT_TARGET_ARCH;
      delete process.env.SCOUT_TARGET_DOMAIN;
      expect(() => ScoutTestTarget.tryFromEnv()).not.toThrow();
    });
  });
});

describe('VALID_SCOUT_TEST_TARGET_DEFINITIONS', () => {
  const allDomains = ScoutTargetDomainSchema.options as ScoutTargetDomain[];

  it('has a target definition for every domain', () => {
    const definedDomains = VALID_SCOUT_TEST_TARGET_DEFINITIONS.map(([d]) => d);
    expect(definedDomains).toHaveLength(allDomains.length);
    expect([...definedDomains].sort()).toEqual([...allDomains].sort());
  });
});

describe('testTargets', () => {
  it('all returns array of all targets', () => {
    const all = testTargets.all;
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
    all.forEach((t) => {
      expect(t).toBeInstanceOf(ScoutTestTarget);
    });
    const tags = all.map((t) => t.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('forLocation(local) returns only local targets', () => {
    const local = testTargets.forLocation('local');
    expect(local.every((t) => t.location === 'local')).toBe(true);
  });

  it('forLocation(cloud) returns only cloud targets', () => {
    const cloud = testTargets.forLocation('cloud');
    expect(cloud.every((t) => t.location === 'cloud')).toBe(true);
  });

  it('local getter returns same as forLocation("local")', () => {
    expect(testTargets.local).toEqual(testTargets.forLocation('local'));
  });

  it('cloud getter returns same as forLocation("cloud")', () => {
    expect(testTargets.cloud).toEqual(testTargets.forLocation('cloud'));
  });

  it("stateful targets don't include domains mapping to project subtypes", () => {
    const validStatefulDomains = [
      'classic',
      'search',
      'observability_complete',
      'security_complete',
    ];

    testTargets.all
      .filter((target) => target.arch === 'stateful')
      .forEach((target) => expect(validStatefulDomains).toContain(target.domain));
  });
});
