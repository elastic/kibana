/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { filterCatalog } from '@kbn/workflows-ui';

/**
 * How many category tiles a solution shows. Product still needs to confirm
 * this number; change it here and the row follows.
 */
export const EMPTY_STATE_CATEGORY_TILE_COUNT = 3;

export type WorkflowSolutionId = 'security' | 'observability' | 'search';

export interface CategoryTileDefinition {
  solution: WorkflowSolutionId;
  category: string;
  /** EUI icon shown above the card title. */
  iconType: string;
  title: () => string;
  description: () => string;
}

const SOLUTION_ORDER: WorkflowSolutionId[] = ['security', 'observability', 'search'];

/** Same glyphs as the template library category list. */
const CATEGORY_ICONS: Record<string, string> = {
  'ai-agent': 'productAgent',
  'case-management': 'briefcase',
  detection: 'warning',
  enrichment: 'tablePlus',
  hunting: 'bullseye',
  integration: 'database',
  monitoring: 'monitoringApp',
  notification: 'bell',
  reporting: 'document',
  response: 'display',
  'root-cause-analysis': 'inspect',
  search: 'search',
  'threat-intel': 'processor',
  utility: 'wrench',
};

/**
 * Draft tiles. Only the Security case-management copy is the requested text.
 * The other entries are real library category ids used as layout placeholders.
 *
 * Search has no templates tagged `solutions: [search]`. Its tiles are
 * categories that exist on cross-solution templates, which the library
 * includes for every solution filter, including Search.
 */
const CATEGORY_TILES_BY_SOLUTION: Record<WorkflowSolutionId, CategoryTileDefinition[]> = {
  security: [
    {
      solution: 'security',
      category: 'case-management',
      iconType: CATEGORY_ICONS['case-management'],
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.caseManagement.title', {
          defaultMessage: 'Case Management',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.caseManagement.description', {
          defaultMessage: 'Browse templates for opening and updating cases.',
        }),
    },
    {
      solution: 'security',
      category: 'response',
      iconType: CATEGORY_ICONS.response,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.response.title', {
          defaultMessage: 'Response',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.response.description', {
          defaultMessage: 'Browse templates for responding to detections.',
        }),
    },
    {
      solution: 'security',
      category: 'threat-intel',
      iconType: CATEGORY_ICONS['threat-intel'],
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.threatIntel.title', {
          defaultMessage: 'Threat Intelligence',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.threatIntel.description', {
          defaultMessage: 'Browse templates for threat intelligence.',
        }),
    },
  ],
  observability: [
    {
      solution: 'observability',
      category: 'monitoring',
      iconType: CATEGORY_ICONS.monitoring,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.monitoring.title', {
          defaultMessage: 'Monitoring',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.monitoring.description', {
          defaultMessage: 'Browse templates for monitoring services and infrastructure.',
        }),
    },
    {
      solution: 'observability',
      category: 'root-cause-analysis',
      iconType: CATEGORY_ICONS['root-cause-analysis'],
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.rootCauseAnalysis.title', {
          defaultMessage: 'Root Cause Analysis',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.rootCauseAnalysis.description', {
          defaultMessage: 'Browse templates for finding the cause of a problem.',
        }),
    },
    {
      solution: 'observability',
      category: 'reporting',
      iconType: CATEGORY_ICONS.reporting,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.reporting.title', {
          defaultMessage: 'Reporting',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.reporting.description', {
          defaultMessage: 'Browse templates for reports.',
        }),
    },
  ],
  search: [
    {
      solution: 'search',
      category: 'search',
      iconType: CATEGORY_ICONS.search,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.search.title', {
          defaultMessage: 'Search',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.search.description', {
          defaultMessage: 'Browse templates for search workflows.',
        }),
    },
    {
      solution: 'search',
      category: 'integration',
      iconType: CATEGORY_ICONS.integration,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.integration.title', {
          defaultMessage: 'Integrations',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.integration.description', {
          defaultMessage: 'Browse templates for connecting systems.',
        }),
    },
    {
      solution: 'search',
      category: 'notification',
      iconType: CATEGORY_ICONS.notification,
      title: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.notification.title', {
          defaultMessage: 'Notifications',
        }),
      description: () =>
        i18n.translate('workflows.agenticFirst.categoryTile.notification.description', {
          defaultMessage: 'Browse templates for sending notifications.',
        }),
    },
  ],
};

/**
 * Tiles for the current solution, or one tile from each solution when none is
 * active. A tile is omitted when that category has no templates under its
 * solution, so the link never opens an empty filter.
 */
export function selectCategoryTiles(
  templates: Template[],
  activeSolution: string | undefined
): CategoryTileDefinition[] {
  const candidates = activeSolution
    ? (CATEGORY_TILES_BY_SOLUTION[activeSolution as WorkflowSolutionId] ?? []).slice(
        0,
        EMPTY_STATE_CATEGORY_TILE_COUNT
      )
    : SOLUTION_ORDER.map((solution) => CATEGORY_TILES_BY_SOLUTION[solution][0]);

  return candidates.filter(
    (tile) =>
      filterCatalog(templates, { solution: tile.solution, categories: [tile.category] }).length > 0
  );
}

/** Tags shown before the "+N" overflow badge. Matches a short row, not the card width. */
export const VISIBLE_CATEGORY_TAG_COUNT = 2;

export interface CategoryTileSummary {
  /** Templates the library shows for this category and solution. */
  templateCount: number;
  /** The tags that appear most often on those templates. */
  visibleTags: string[];
  /** Distinct tags that did not fit in `visibleTags`. */
  overflowTagCount: number;
}

/**
 * Count and tags for one tile. The count uses the same solution and category
 * filter as the library. Tags are the templates' categories, most frequent
 * first. Ties break alphabetically so the row stays stable.
 */
export function summarizeCategoryTile(
  templates: Template[],
  tile: CategoryTileDefinition
): CategoryTileSummary {
  const matched = filterCatalog(templates, {
    solution: tile.solution,
    categories: [tile.category],
  });
  const counts = new Map<string, number>();
  for (const template of matched) {
    for (const category of template.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const visibleTags = ranked.slice(0, VISIBLE_CATEGORY_TAG_COUNT).map(([id]) => id);
  return {
    templateCount: matched.length,
    visibleTags,
    overflowTagCount: Math.max(ranked.length - visibleTags.length, 0),
  };
}

/** Query string for the library. Solution is included only when nav does not lock it. */
export function categoryLibrarySearch(
  tile: CategoryTileDefinition,
  activeSolution: string | undefined
): string {
  const params = new URLSearchParams();
  params.set('category', tile.category);
  if (!activeSolution) {
    params.set('solution', tile.solution);
  }
  return `?${params.toString()}`;
}
