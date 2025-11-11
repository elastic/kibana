/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DocumentationGroup, LanguageDocumentationSections } from '../types';
import { highlightMatches } from './highlight_matches';

/**
 * Filters the documentation groups based on the search criteria.
 * Returns the groups and items ranked as follows:
 * 1- Groups with items that match the search text in their label
 * 2- Groups with items that match the search text in their description
 * 3- Groups that match the search text in their label
 *
 * @param searchText - The text to search for
 * @param searchInDescription - Whether to search in item descriptions
 * @param sections - The documentation sections to filter
 * @param numOfGroupsToOmit - Number of groups to skip from the beginning
 * @param highlightMatchingText - Whether to highlight matching text in results
 */
export const getFilteredGroups = (
  searchText: string,
  searchInDescription?: boolean,
  sections?: LanguageDocumentationSections,
  numOfGroupsToOmit = 0,
  highlightMatchingText = true
): DocumentationGroup[] => {
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();

  // If no search text, return all groups with all items
  if (!normalizedSearchText) {
    return (
      sections?.groups.slice(numOfGroupsToOmit).map((group) => ({
        ...group,
        options: group.items,
      })) ?? []
    );
  }

  const filteredGroups =
    sections?.groups
      .slice(numOfGroupsToOmit)
      .map((group) => {
        // Separate items that match on label vs description
        const labelMatches: typeof group.items = [];
        const descriptionMatches: typeof group.items = [];

        group.items.forEach((helpItem) => {
          const labelMatch = helpItem.label.toLocaleLowerCase().includes(normalizedSearchText);
          const descriptionMatch =
            searchInDescription &&
            helpItem.description?.markdownContent
              .toLocaleLowerCase()
              .includes(normalizedSearchText);

          if (labelMatch) {
            labelMatches.push(helpItem);
          } else if (descriptionMatch) {
            descriptionMatches.push(helpItem);
          }
        });

        // Show items with label matches first
        const items = [...labelMatches, ...descriptionMatches];

        return { ...group, items, hasLabelMatches: labelMatches.length > 0 };
      })
      .filter((group) => {
        if (group.items.length > 0) {
          return true;
        }
        return group.label.toLocaleLowerCase().includes(normalizedSearchText);
      })
      // Show groups with items label matching first
      .sort((a, b) => (b.hasLabelMatches ? 1 : 0) - (a.hasLabelMatches ? 1 : 0))
      // Clean hasLabelMatches field
      .map((group) => {
        const { hasLabelMatches, ...rest } = group;
        return rest;
      }) ?? [];

  if (!highlightMatchingText) {
    return filteredGroups;
  }

  return filteredGroups.map((group) => ({
    ...group,
    label: highlightMatches(group.label, searchText),
    description: highlightMatches(group.description ?? '', searchText),
    items: group.items.map((item) => ({
      ...item,
      label: highlightMatches(item.label, searchText),
      description: {
        ...item.description,
        markdownContent: highlightMatches(item.description?.markdownContent || '', searchText),
      },
    })),
  }));
};
