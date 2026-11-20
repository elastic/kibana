/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodError } from '@kbn/zod/v4';

/**
 * Attributes describing the environment a Scout test target runs in, beyond its
 * location / architecture / domain.
 *
 * Attribute names must not contain '-': the limit tag format packs the selection
 * method and the attribute into a single '-'-separated pair.
 */
export const SCOUT_TARGET_ATTRIBUTE_VALUES = ['fips'] as const;
export const ScoutTargetAttributeSchema = z.enum(SCOUT_TARGET_ATTRIBUTE_VALUES);
export type ScoutTargetAttribute = z.infer<typeof ScoutTargetAttributeSchema>;

export const SCOUT_LIMIT_SELECTION_METHOD_VALUES = ['only', 'except'] as const;
export const ScoutLimitSelectionMethodSchema = z.enum(SCOUT_LIMIT_SELECTION_METHOD_VALUES);
export type ScoutLimitSelectionMethod = z.infer<typeof ScoutLimitSelectionMethodSchema>;

export const ScoutTestLimitSchema = z.object({
  selectionMethod: ScoutLimitSelectionMethodSchema,
  targetAttribute: ScoutTargetAttributeSchema,
});

/**
 * A constraint that narrows the test targets a test may run on, based on whether a
 * target attribute is present.
 *
 * - `only`   -> the test runs **only** when the attribute is present
 * - `except` -> the test runs **only** when the attribute is **not** present
 *
 * Tests without any limit are attribute-agnostic and run in both cases.
 */
export class ScoutTestLimit {
  static tagPrefix: string = 'limit/';
  static tagPattern: RegExp = /^limit\/(\w+)-(\w+)$/;
  public selectionMethod: ScoutLimitSelectionMethod;
  public targetAttribute: ScoutTargetAttribute;

  constructor(
    selectionMethod: string | ScoutLimitSelectionMethod,
    targetAttribute: string | ScoutTargetAttribute
  ) {
    try {
      const parsed = ScoutTestLimitSchema.parse({ selectionMethod, targetAttribute });
      this.selectionMethod = parsed.selectionMethod;
      this.targetAttribute = parsed.targetAttribute;
    } catch (e) {
      if (!(e instanceof ZodError)) throw e;
      const issueMessages = e.issues.map((issue) => ` - ${issue.path} / ${issue.message}`);
      throw new Error(
        `Scout test limit validation discovered ${issueMessages.length} issue(s):` +
          `\n${issueMessages.join('\n')}`
      );
    }
  }

  public get tag(): string {
    return `${ScoutTestLimit.tagPrefix}${this.selectionMethod}-${this.targetAttribute}`;
  }

  public get playwrightTag(): string {
    return `@${this.tag}`;
  }

  static isTag(tag: string): boolean {
    return tag.startsWith(ScoutTestLimit.tagPrefix);
  }

  static isPlaywrightTag(playwrightTag: string): boolean {
    return playwrightTag.startsWith(`@${ScoutTestLimit.tagPrefix}`);
  }

  static fromTag(tag: string): ScoutTestLimit {
    const match = tag.match(ScoutTestLimit.tagPattern);

    if (match == null) {
      throw new Error(
        `Failed to parse Scout test limit from tag '${tag}': ` +
          `tag did not match the expected regex pattern of ${ScoutTestLimit.tagPattern}`
      );
    }

    const [, selectionMethod, targetAttribute] = match;
    return new ScoutTestLimit(selectionMethod, targetAttribute);
  }

  static fromPlaywrightTag(playwrightTag: string): ScoutTestLimit {
    if (!playwrightTag.startsWith('@')) {
      throw new Error(
        `Failed to parse Scout test limit from Playwright tag '${playwrightTag}': ` +
          'expected tag to start with @'
      );
    }

    return ScoutTestLimit.fromTag(playwrightTag.slice(1));
  }

  /**
   * Whether this limit is satisfied by the given set of target attributes.
   */
  public isSatisfiedBy(attributes: Iterable<ScoutTargetAttribute>): boolean {
    const isPresent = new Set(attributes).has(this.targetAttribute);
    return this.selectionMethod === 'only' ? isPresent : !isPresent;
  }
}

export const testLimits = {
  get all(): ScoutTestLimit[] {
    return SCOUT_LIMIT_SELECTION_METHOD_VALUES.flatMap((selectionMethod) =>
      SCOUT_TARGET_ATTRIBUTE_VALUES.map(
        (targetAttribute) => new ScoutTestLimit(selectionMethod, targetAttribute)
      )
    );
  },

  isPlaywrightTag(playwrightTag: string): boolean {
    return ScoutTestLimit.isPlaywrightTag(playwrightTag);
  },

  /**
   * Parse every limit encoded in a Playwright tag list, ignoring non-limit tags.
   */
  fromPlaywrightTags(playwrightTags: readonly string[]): ScoutTestLimit[] {
    return playwrightTags
      .filter((playwrightTag) => ScoutTestLimit.isPlaywrightTag(playwrightTag))
      .map((playwrightTag) => ScoutTestLimit.fromPlaywrightTag(playwrightTag));
  },

  /**
   * Whether a test carrying the given Playwright tags may run against a test target
   * with the given attributes. Every limit on the test must be satisfied.
   */
  allow(playwrightTags: readonly string[], attributes: Iterable<ScoutTargetAttribute>): boolean {
    const presentAttributes = new Set(attributes);
    return this.fromPlaywrightTags(playwrightTags).every((limit) =>
      limit.isSatisfiedBy(presentAttributes)
    );
  },

  /**
   * Limits that are **not** satisfied by the given attributes; a test carrying any of
   * these must not run.
   */
  unsatisfiedBy(attributes: Iterable<ScoutTargetAttribute>): ScoutTestLimit[] {
    const presentAttributes = new Set(attributes);
    return this.all.filter((limit) => !limit.isSatisfiedBy(presentAttributes));
  },
};

export const targetAttributes: {
  all: readonly ScoutTargetAttribute[];
  fromString(raw: string): ScoutTargetAttribute;
  fromCommaSeparated(raw: string | null | undefined): ScoutTargetAttribute[];
  key(attributes: Iterable<ScoutTargetAttribute>): string;
  current(): ScoutTargetAttribute[];
} = {
  all: SCOUT_TARGET_ATTRIBUTE_VALUES,

  fromString(raw) {
    try {
      return ScoutTargetAttributeSchema.parse(raw);
    } catch (e) {
      if (e instanceof ZodError) {
        e.message =
          `Failed to parse the string '${raw}' as a Scout test target attribute` +
          `; valid attributes: ${SCOUT_TARGET_ATTRIBUTE_VALUES.join(', ')}`;
      }

      throw e;
    }
  },

  /**
   * Parse a comma-separated attribute list, de-duplicated and in declaration order.
   */
  fromCommaSeparated(raw) {
    if (raw == null || raw.trim().length === 0) {
      return [];
    }

    return [
      ...new Set(
        raw
          .split(',')
          .map((rawAttribute) => rawAttribute.trim())
          .filter((rawAttribute) => rawAttribute.length > 0)
          .map((rawAttribute) => this.fromString(rawAttribute))
      ),
    ];
  },

  /**
   * Canonical, order-independent key for a set of attributes; empty string for none.
   * Used to group and match runtime statistics per attribute set.
   */
  key(attributes) {
    return [...new Set(attributes)].sort().join(',');
  },

  /**
   * Target attributes declared for the current process via SCOUT_TARGET_ATTRIBUTES
   * (comma-separated). Empty when the variable is unset: attributes are never
   * auto-detected, they must always be passed in explicitly.
   */
  current() {
    return this.fromCommaSeparated(process.env.SCOUT_TARGET_ATTRIBUTES);
  },
};
