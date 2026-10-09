/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { testTargets } from '@kbn/scout-info';
import type { ScoutTargetArch, ScoutTargetDomain, ScoutTargetLocation } from '@kbn/scout-info';

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

const buildTags = (location: ScoutTargetLocation | 'all') => ({
  stateful: {
    classic: getPlaywrightTagsFor('stateful', 'classic', location),

    // `search` / `observability` / `security` are intentionally not exposed for `stateful`:
    // CI only schedules stateful runs tagged `classic` (see `getServerRunFlagsFromTags` in
    // `../tests_discovery/tag_utils.ts`), so other domains would be discovered but never run.
    // Use `tags.stateful.classic` instead.

    /**
     * Tags to target all supported stateful deployment types
     */
    get all(): string[] {
      return [...this.classic];
    },
  },
  serverless: {
    search: getPlaywrightTagsFor('serverless', 'search', location),
    observability: {
      complete: getPlaywrightTagsFor('serverless', 'observability_complete', location),
      logs_essentials: getPlaywrightTagsFor(
        'serverless',
        'observability_logs_essentials',
        location
      ),

      /**
       * All observability project types
       */
      get all(): string[] {
        return [...this.complete, ...this.logs_essentials];
      },
    },
    security: {
      complete: getPlaywrightTagsFor('serverless', 'security_complete', location),
      essentials: getPlaywrightTagsFor('serverless', 'security_essentials', location),
      ease: getPlaywrightTagsFor('serverless', 'security_ease', location),

      /**
       * All security project types
       */
      get all(): string[] {
        return [...this.complete, ...this.essentials, ...this.ease];
      },
    },
    workplaceai: getPlaywrightTagsFor('serverless', 'workplaceai', location),
    vectordb: getPlaywrightTagsFor('serverless', 'vectordb', location),

    /**
     * All serverless project types
     */
    get all(): string[] {
      return [
        ...this.search,
        ...this.observability.all,
        ...this.security.all,
        ...this.workplaceai,
        ...this.vectordb,
      ];
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
});

export const tags = {
  ...buildTags('all'),

  /**
   * Local-only variants of the tag sets above (`@local-*` tags, no `@cloud-*`).
   * Required for tests under `test/scout_*` (custom server configs): those configs start
   * Kibana with custom server args, so they only run locally and never against Cloud.
   */
  local: buildTags('local'),
  performance: ['@perf'],
};
