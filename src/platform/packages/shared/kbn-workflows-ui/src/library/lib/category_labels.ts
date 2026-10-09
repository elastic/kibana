/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { humanizeCategoryId } from './humanize_category_id';

/**
 * Localized display names for the closed category vocabulary owned by
 * `elastic/workflows` (`library/categories.yaml`). Only the category *id*
 * crosses the CDN boundary — it rides on each catalog row's `categories` — so
 * the human-readable name lives here, where Kibana's i18n tooling can extract
 * and translate it (a name fetched at runtime from the CDN could never be
 * localized).
 *
 * Keep the ids and English `defaultMessage`s in sync with the `id`/`name`
 * pairs in `library/categories.yaml`. An id not listed here (e.g. a category
 * published after this Kibana build) falls back to {@link humanizeCategoryId}.
 *
 * Thunks (not eager values) so each label resolves against the active locale
 * at call time rather than at module load.
 */
const CATEGORY_NAMES: Record<string, () => string> = {
  enrichment: () =>
    i18n.translate('workflows.library.category.enrichment', { defaultMessage: 'Enrichment' }),
  detection: () =>
    i18n.translate('workflows.library.category.detection', { defaultMessage: 'Detection' }),
  response: () =>
    i18n.translate('workflows.library.category.response', { defaultMessage: 'Response' }),
  hunting: () =>
    i18n.translate('workflows.library.category.hunting', { defaultMessage: 'Hunting' }),
  'threat-intel': () =>
    i18n.translate('workflows.library.category.threatIntel', {
      defaultMessage: 'Threat intelligence',
    }),
  notification: () =>
    i18n.translate('workflows.library.category.notification', { defaultMessage: 'Notification' }),
  'case-management': () =>
    i18n.translate('workflows.library.category.caseManagement', {
      defaultMessage: 'Case management',
    }),
  monitoring: () =>
    i18n.translate('workflows.library.category.monitoring', { defaultMessage: 'Monitoring' }),
  'root-cause-analysis': () =>
    i18n.translate('workflows.library.category.rootCauseAnalysis', {
      defaultMessage: 'Root cause analysis',
    }),
  'data-ingestion': () =>
    i18n.translate('workflows.library.category.dataIngestion', {
      defaultMessage: 'Data ingestion',
    }),
  'data-transformation': () =>
    i18n.translate('workflows.library.category.dataTransformation', {
      defaultMessage: 'Data transformation',
    }),
  reporting: () =>
    i18n.translate('workflows.library.category.reporting', { defaultMessage: 'Reporting' }),
  search: () => i18n.translate('workflows.library.category.search', { defaultMessage: 'Search' }),
  'ai-agent': () =>
    i18n.translate('workflows.library.category.aiAgent', { defaultMessage: 'AI agent' }),
  integration: () =>
    i18n.translate('workflows.library.category.integration', { defaultMessage: 'Integration' }),
  utility: () =>
    i18n.translate('workflows.library.category.utility', { defaultMessage: 'Utility' }),
};

/**
 * Resolve a category id to its localized display name, falling back to a
 * humanized form of the id for categories this Kibana build doesn't recognize.
 */
export function getCategoryLabel(id: string): string {
  return CATEGORY_NAMES[id]?.() ?? humanizeCategoryId(id);
}
