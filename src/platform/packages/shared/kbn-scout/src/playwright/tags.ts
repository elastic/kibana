/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import {
  SCOUT_PERFORMANCE_PLAYWRIGHT_TAG,
  ScoutTestLimit,
  testLimits,
  testTargets,
} from '@kbn/scout-info';
import type {
  ScoutLimitSelectionMethod,
  ScoutTargetArch,
  ScoutTargetAttribute,
  ScoutTargetDomain,
  ScoutTargetLocation,
} from '@kbn/scout-info';
import type { PlaywrightTestCLIOptions } from './cli_wrapper/run_tests';

/**
 * Get a list of Playwright tags that select a particular test target
 *
 * @param arch Test target architecture
 * @param domain Test target domain
 * @param location Test target location
 *
 * @return List of tags ready to use with Scout Playwright tests
 */
export const getPlaywrightTagsFor = (
  arch: ScoutTargetArch,
  domain: ScoutTargetDomain,
  location: ScoutTargetLocation | 'all' = 'all'
): string[] => {
  return (location === 'all' ? testTargets.all : testTargets.forLocation(location))
    .filter((target) => target.arch === arch && target.domain === domain)
    .map((target) => target.playwrightTag);
};

/**
 * Get the Playwright tag that limits a test to targets with (or without) a given attribute
 *
 * @param selectionMethod `only` to require the attribute, `except` to require its absence
 * @param targetAttribute Test target attribute the limit applies to
 *
 * @return Tag ready to use with Scout Playwright tests
 */
export const getPlaywrightLimitTagFor = (
  selectionMethod: ScoutLimitSelectionMethod,
  targetAttribute: ScoutTargetAttribute
): string => new ScoutTestLimit(selectionMethod, targetAttribute).playwrightTag;

/**
 * Build the Playwright `grepInvert` pattern that drops every test whose limit tags are
 * not satisfied by the given target attributes.
 *
 * @param attributes Attributes of the test target the tests are about to run against
 *
 * @return Pattern to pass to Playwright, or `undefined` when nothing has to be dropped
 */
export const getPlaywrightLimitGrepInvert = (
  attributes: Iterable<ScoutTargetAttribute>
): RegExp | undefined => {
  const unsatisfiedTags = testLimits
    .unsatisfiedBy(attributes)
    .map((limit) => escapeRegExp(limit.playwrightTag));

  if (unsatisfiedTags.length === 0) {
    return undefined;
  }

  // Playwright matches this against the title path and tags joined by spaces, so anchor on
  // whitespace: an unanchored '@limit/only-fips' would also match '@limit/only-fips140'.
  // Playwright offers no tags-only matcher, so a title containing a limit tag verbatim is
  // still matched and its test skipped.
  return new RegExp(`(?:^|\\s)(?:${unsatisfiedTags.join('|')})(?=\\s|$)`);
};

/**
 * Playwright CLI options a run adds to its own so that tests whose limit tags the given
 * target attributes don't satisfy are skipped.
 *
 * Only options the caller doesn't already own may appear here: runners always set the
 * config, project and target `--grep` themselves.
 */
export type PlaywrightLimitOptions = Pick<PlaywrightTestCLIOptions, 'grepInvert'>;

/**
 * Get the Playwright CLI options that apply test limits for the given target attributes
 *
 * @param attributes Attributes of the test target the tests are about to run against
 *
 * @return Options to translate into Playwright CLI flags; empty when nothing has to be skipped
 */
export const getPlaywrightLimitOptions = (
  attributes: Iterable<ScoutTargetAttribute>
): PlaywrightLimitOptions => {
  const grepInvert = getPlaywrightLimitGrepInvert(attributes);
  return grepInvert ? { grepInvert: grepInvert.source } : {};
};

export const tags = {
  stateful: {
    classic: getPlaywrightTagsFor('stateful', 'classic'),
    search: getPlaywrightTagsFor('stateful', 'search'),
    observability: getPlaywrightTagsFor('stateful', 'observability_complete'),
    security: getPlaywrightTagsFor('stateful', 'security_complete'),

    /**
     * Tags to target all stateful deployment types
     */
    get all(): string[] {
      return [...this.classic, ...this.search, ...this.observability, ...this.security];
    },
  },
  serverless: {
    search: getPlaywrightTagsFor('serverless', 'search'),
    observability: {
      complete: getPlaywrightTagsFor('serverless', 'observability_complete'),
      logs_essentials: getPlaywrightTagsFor('serverless', 'observability_logs_essentials'),

      /**
       * All observability project types
       */
      get all(): string[] {
        return [...this.complete, ...this.logs_essentials];
      },
    },
    security: {
      complete: getPlaywrightTagsFor('serverless', 'security_complete'),
      essentials: getPlaywrightTagsFor('serverless', 'security_essentials'),
      ease: getPlaywrightTagsFor('serverless', 'security_ease'),

      /**
       * All security project types
       */
      get all(): string[] {
        return [...this.complete, ...this.essentials, ...this.ease];
      },
    },
    workplaceai: getPlaywrightTagsFor('serverless', 'workplaceai'),

    /**
     * All serverless project types
     */
    get all(): string[] {
      return [...this.search, ...this.observability.all, ...this.security.all, ...this.workplaceai];
    },
  },

  /**
   * Deployment-agnostic tag set; composed of tags for:
   * - local stateful (self-managed) & Elastic Cloud hosted (ECH) - all types
   * - local serverless (mock-serverless) & Elastic Cloud projects (MKI) - only types that have a **stateful counterpart**
   *
   * ⚠️ This does NOT include serverless project subtypes or Workplace AI projects.
   */
  get deploymentAgnostic(): string[] {
    return [
      ...this.stateful.all,
      ...this.serverless.search,
      ...this.serverless.observability.complete,
      ...this.serverless.security.complete,
    ];
  },
  performance: [SCOUT_PERFORMANCE_PLAYWRIGHT_TAG],

  /**
   * Limits narrowing the test targets a test runs on, based on target attributes.
   * They complement — never replace — the deployment tags above: a test still needs
   * at least one deployment tag to be discovered at all.
   *
   * ```ts
   * test.describe('FIPS-only behavior', {
   *   tag: [...tags.deploymentAgnostic, tags.limit.only.fips],
   * }, () => { ... });
   * ```
   */
  limit: {
    /**
     * Run the test **only** when the attribute is present
     */
    only: {
      fips: getPlaywrightLimitTagFor('only', 'fips'),
    },

    /**
     * Run the test **only** when the attribute is **not** present
     */
    except: {
      fips: getPlaywrightLimitTagFor('except', 'fips'),
    },
  },
};
