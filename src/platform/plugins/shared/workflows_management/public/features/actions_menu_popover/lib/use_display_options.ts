/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionOptionData,
  EditorCommand,
  JumpToStepEntry,
  MenuSelectableOption,
} from '../types';

export const STEPS_PREFIX = 'Steps: ';
export const MAX_VISIBLE_STEPS = 7;

interface UseDisplayOptionsArgs {
  /** Current browse-level options (root categories or a subgroup). */
  options: ActionOptionData[];
  /** Full category tree — used to section search results by root category. */
  categoryTree?: ActionOptionData[];
  searchTerm: string;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
  currentPath: string[];
}

export function useDisplayOptions({
  options,
  categoryTree,
  searchTerm,
  commands,
  jumpToStepEntries,
  currentPath,
}: UseDisplayOptionsArgs): MenuSelectableOption[] {
  return useMemo(
    () =>
      buildDisplayOptions({
        options,
        categoryTree,
        searchTerm,
        commands,
        jumpToStepEntries,
        currentPath,
      }),
    [options, categoryTree, searchTerm, commands, jumpToStepEntries, currentPath]
  );
}

const MAX_ACTION_MATCH_RANK = 5;

function getActionMatchRank(option: ActionOptionData, normalizedTerm: string): number {
  if (!normalizedTerm) return 0;
  const id = option.id.toLowerCase();
  const label = option.label.toLowerCase();
  const description = option.description?.toLowerCase() ?? '';

  if (id === normalizedTerm) return 0;
  if (label === normalizedTerm) return 1;
  if (description === normalizedTerm) return 2;
  if (id.includes(normalizedTerm)) return 3;
  if (label.includes(normalizedTerm)) return 4;
  if (description.includes(normalizedTerm)) return 5;
  return MAX_ACTION_MATCH_RANK + 1;
}

function isActionSearchMatch(option: ActionOptionData, normalizedTerm: string): boolean {
  return getActionMatchRank(option, normalizedTerm) <= MAX_ACTION_MATCH_RANK;
}

/**
 * Collect matching items under a category. Skips the category root itself
 * (it becomes the section header). Nested matches get a parent-context description.
 */
function collectCategoryMatches(
  node: ActionOptionData,
  term: string,
  ancestors: ActionOptionData[] = [],
  isCategoryRoot = true
): ActionOptionData[] {
  const results: ActionOptionData[] = [];

  if (!isCategoryRoot && isActionSearchMatch(node, term)) {
    const parent = ancestors[ancestors.length - 1];
    results.push(
      parent
        ? {
            ...node,
            // e.g. "Shodan - Count results" when nested under a connector group
            description: `${parent.label} - ${node.label}`,
          }
        : node
    );
  }

  if ('options' in node && Array.isArray(node.options)) {
    for (const child of node.options) {
      const nextAncestors = isCategoryRoot ? [] : [...ancestors, node];
      results.push(...collectCategoryMatches(child, term, nextAncestors, false));
    }
  }

  return results;
}

function sortMatches(matches: ActionOptionData[], term: string): ActionOptionData[] {
  return [...matches].sort((a, b) => {
    const rankDiff = getActionMatchRank(a, term) - getActionMatchRank(b, term);
    return rankDiff !== 0 ? rankDiff : a.label.localeCompare(b.label);
  });
}

function buildSearchModeOptions({
  categoryTree,
  term,
  commands,
  jumpToStepEntries,
}: {
  categoryTree: ActionOptionData[];
  term: string;
  commands?: EditorCommand[];
  jumpToStepEntries?: JumpToStepEntry[];
}): MenuSelectableOption[] {
  const result: MenuSelectableOption[] = [];

  for (const category of categoryTree) {
    const matches = sortMatches(collectCategoryMatches(category, term), term);
    if (matches.length > 0) {
      result.push({
        label: category.label,
        isGroupLabel: true,
      });
      for (const match of matches) {
        result.push({
          label: match.label,
          data: { menuItem: { kind: 'action', action: match } },
        });
      }
    }
  }

  const filteredCmds = (commands ?? []).filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(term) ||
      (cmd.description?.toLowerCase().includes(term) ?? false)
  );
  if (filteredCmds.length > 0) {
    result.push({
      label: i18n.translate('workflows.actionsMenu.commandsGroupLabel', {
        defaultMessage: 'Commands',
      }),
      isGroupLabel: true,
    });
    for (const cmd of filteredCmds) {
      result.push({
        label: cmd.label,
        className: 'compactOption',
        data: { menuItem: { kind: 'command', command: cmd } },
      });
    }
  }

  const filteredJumps = (jumpToStepEntries ?? []).filter(
    (entry) => entry.id.toLowerCase().includes(term) || entry.label.toLowerCase().includes(term)
  );
  if (filteredJumps.length > 0) {
    result.push({
      label: i18n.translate('workflows.actionsMenu.jumpToStepGroupLabel', {
        defaultMessage: 'Jump to a step',
      }),
      isGroupLabel: true,
    });
    for (const entry of filteredJumps) {
      result.push({
        label: entry.label,
        className: 'compactOption',
        data: { menuItem: { kind: 'jump', entry } },
      });
    }
    if ((jumpToStepEntries ?? []).length > filteredJumps.length) {
      result.push({
        label: i18n.translate('workflows.actionsMenu.viewAllExistingSteps', {
          defaultMessage: 'View all existing steps',
        }),
        className: 'compactOption',
        data: { menuItem: { kind: 'nav', target: 'viewExisting' } },
      });
    }
  }

  return result;
}

export function buildDisplayOptions({
  options,
  categoryTree,
  searchTerm,
  commands,
  jumpToStepEntries,
  currentPath,
}: UseDisplayOptionsArgs): MenuSelectableOption[] {
  const result: MenuSelectableOption[] = [];
  const term = searchTerm.trim().toLowerCase();
  const isStepsMode = searchTerm.startsWith(STEPS_PREFIX);
  const isHashMode = !isStepsMode && searchTerm.trimStart().startsWith('#');
  const hasSearch = term.length > 0;

  if (currentPath.length > 0 && !hasSearch) {
    // Always present subcategory rows A–Z (External, Cases, Data transformation, …)
    const sortedOptions = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true })
    );
    for (const opt of sortedOptions) {
      result.push({ label: opt.label, data: { menuItem: { kind: 'action', action: opt } } });
    }
    return result;
  }

  if (isHashMode) {
    const jumpTerm = term.slice(1).trim();
    const filteredJumps = (jumpToStepEntries ?? []).filter(
      (entry) => !jumpTerm || entry.id.toLowerCase().includes(jumpTerm)
    );
    if (filteredJumps.length > 0) {
      result.push({
        label: i18n.translate('workflows.actionsMenu.jumpToStepGroupLabel', {
          defaultMessage: 'Jump to a step',
        }),
        isGroupLabel: true,
      });
      for (const entry of filteredJumps) {
        result.push({
          label: entry.label,
          className: 'compactOption',
          data: { menuItem: { kind: 'jump', entry } },
        });
      }
    }
    return result;
  }

  if (isStepsMode) {
    for (const opt of options) {
      result.push({ label: opt.label, data: { menuItem: { kind: 'action', action: opt } } });
    }
    return result;
  }

  // Search mode: section results by root category (mockup: External / Data transformation / …)
  if (hasSearch) {
    const tree = categoryTree ?? options;
    return buildSearchModeOptions({
      categoryTree: tree,
      term,
      commands,
      jumpToStepEntries,
    });
  }

  // Root browse list (no search)
  result.push({
    label: i18n.translate('workflows.actionsMenu.addStepGroupLabel', {
      defaultMessage: 'Add trigger or step',
    }),
    isGroupLabel: true,
  });

  for (const opt of options) {
    result.push({ label: opt.label, data: { menuItem: { kind: 'action', action: opt } } });
  }

  const filteredCmds = (commands ?? []).filter((cmd) => {
    if (!term) {
      return true;
    }
    const label = cmd.label.toLowerCase();
    const description = cmd.description?.toLowerCase() ?? '';
    return label.includes(term) || description.includes(term);
  });
  if (filteredCmds.length > 0) {
    result.push({
      label: i18n.translate('workflows.actionsMenu.commandsGroupLabel', {
        defaultMessage: 'Commands',
      }),
      isGroupLabel: true,
    });
    for (const cmd of filteredCmds) {
      result.push({
        label: cmd.label,
        className: 'compactOption',
        data: { menuItem: { kind: 'command', command: cmd } },
      });
    }
  }

  return result;
}
