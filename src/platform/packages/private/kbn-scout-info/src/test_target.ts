/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ZodError } from '@kbn/zod/v4';

export const SCOUT_TARGET_LOCATION: string = process.env.SCOUT_TARGET_LOCATION || 'unknown';
export const SCOUT_TARGET_ARCH: string = process.env.SCOUT_TARGET_ARCH || 'unknown';
export const SCOUT_TARGET_DOMAIN: string = process.env.SCOUT_TARGET_DOMAIN || 'unknown';

export const ScoutTargetLocationSchema = z.enum(['local', 'cloud']);
export const ScoutTargetArchSchema = z.enum(['stateful', 'serverless']);
export const ScoutTargetDomainSchema = z.enum([
  'classic',
  'search',
  'observability_complete',
  'observability_logs_essentials',
  'security_complete',
  'security_essentials',
  'security_ease',
  'workplaceai',
]);
export const ScoutTestTargetSchema = z.object({
  location: ScoutTargetLocationSchema,
  arch: ScoutTargetArchSchema,
  domain: ScoutTargetDomainSchema,
});

export type ScoutTargetLocation = z.infer<typeof ScoutTargetLocationSchema>;
export type ScoutTargetArch = z.infer<typeof ScoutTargetArchSchema>;
export type ScoutTargetDomain = z.infer<typeof ScoutTargetDomainSchema>;

export interface ScoutTargetDefinition {
  locations: ScoutTargetLocation[];
  architectures: ScoutTargetArch[];
}

export class ScoutTestTarget {
  static tagPattern: RegExp = /(\w*)-(\w*)-(\w*)/;
  public location: ScoutTargetLocation;
  public arch: ScoutTargetArch;
  public domain: ScoutTargetDomain;

  constructor(
    location: string | ScoutTargetLocation,
    arch: string | ScoutTargetArch,
    domain: string | ScoutTargetDomain
  ) {
    try {
      const parsed = ScoutTestTargetSchema.parse({ location, arch, domain });
      this.location = parsed.location;
      this.arch = parsed.arch;
      this.domain = parsed.domain;
    } catch (e) {
      if (!(e instanceof ZodError)) throw e;
      const issueMessages = e.issues.map((issue) => ` - ${issue.path} / ${issue.message}`);
      throw new Error(
        `Scout test target validation discovered ${issueMessages.length} issue(s):` +
          `\n${issueMessages.join('\n')}`
      );
    }
  }

  public get tagWithoutLocation(): string {
    return [this.arch, this.domain].join('-');
  }

  public get tag(): string {
    return [this.location, this.tagWithoutLocation].join('-');
  }

  public get playwrightTag(): string {
    return ['@', this.tag].join('');
  }

  static fromTag(tag: string): ScoutTestTarget {
    const match = tag.match(ScoutTestTarget.tagPattern);

    if (match == null) {
      throw new Error(
        `Failed to parse Scout test target from tag '${tag}': ` +
          `tag did not match the expected regex pattern of ${ScoutTestTarget.tagPattern}`
      );
    }

    const [, location, architecture, domain] = match;
    return new ScoutTestTarget(location, architecture, domain);
  }

  static fromPlaywrightTag(playwrightTag: string) {
    if (!playwrightTag.startsWith('@')) {
      throw new Error(
        `Failed to parse Scout test target from Playwright tag '${playwrightTag}': ` +
          'expected tag to start with @'
      );
    }

    return ScoutTestTarget.fromTag(playwrightTag.slice(1));
  }

  static fromEnv() {
    return new ScoutTestTarget(SCOUT_TARGET_LOCATION, SCOUT_TARGET_ARCH, SCOUT_TARGET_DOMAIN);
  }

  /**
   * Like fromEnv() but suppresses errors and returns undefined when Scout target env vars are missing or invalid.
   */
  static tryFromEnv(): ScoutTestTarget | undefined {
    try {
      return ScoutTestTarget.fromEnv();
    } catch {
      return undefined;
    }
  }
}

export const VALID_SCOUT_TEST_TARGET_DEFINITIONS: [ScoutTargetDomain, ScoutTargetDefinition][] = [
  [
    'classic',
    {
      locations: ['local', 'cloud'],
      architectures: ['stateful'],
    },
  ],
  [
    'search',
    {
      locations: ['local', 'cloud'],
      architectures: ['stateful', 'serverless'],
    },
  ],
  [
    'observability_complete',
    {
      locations: ['local', 'cloud'],
      architectures: ['stateful', 'serverless'],
    },
  ],
  [
    'observability_logs_essentials',
    {
      locations: ['local', 'cloud'],
      architectures: ['serverless'],
    },
  ],
  [
    'security_complete',
    {
      locations: ['local', 'cloud'],
      architectures: ['stateful', 'serverless'],
    },
  ],
  [
    'security_essentials',
    {
      locations: ['local', 'cloud'],
      architectures: ['serverless'],
    },
  ],
  [
    'security_ease',
    {
      locations: ['local', 'cloud'],
      architectures: ['serverless'],
    },
  ],
  [
    'workplaceai',
    {
      locations: ['local', 'cloud'],
      architectures: ['serverless'],
    },
  ],
];

export const testTargets = {
  get all(): ScoutTestTarget[] {
    return VALID_SCOUT_TEST_TARGET_DEFINITIONS.flatMap(([domain, target]) =>
      target.locations.flatMap((location) =>
        target.architectures.map((arch) => new ScoutTestTarget(location, arch, domain))
      )
    ).sort();
  },

  forLocation(location: ScoutTargetLocation): ScoutTestTarget[] {
    return this.all.filter((target) => target.location === location);
  },

  get local(): ScoutTestTarget[] {
    return this.forLocation('local');
  },

  get cloud(): ScoutTestTarget[] {
    return this.forLocation('cloud');
  },
};
