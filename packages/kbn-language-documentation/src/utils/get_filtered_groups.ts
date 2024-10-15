/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LanguageDocumentationSections } from '../types';
import { elementToString } from './element_to_string';

export const getFilteredGroups = (
  searchText: string,
  searchInDescription?: boolean,
  sections?: LanguageDocumentationSections,
  numOfGroupsToOmit?: number
) => {
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  return sections?.groups
    .slice(numOfGroupsToOmit ?? 0)
    .map((group) => {
      const options = group.items.filter((helpItem) => {
        return (
          !normalizedSearchText ||
          helpItem.label.toLocaleLowerCase().includes(normalizedSearchText) ||
          // Converting the JSX element to a string first
          (searchInDescription &&
            elementToString(helpItem.description)
              ?.toLocaleLowerCase()
              .includes(normalizedSearchText))
        );
      });
      return { ...group, options };
    })
    .filter((group) => {
      if (group.options.length > 0 || !normalizedSearchText) {
        return true;
      }
      return group.label.toLocaleLowerCase().includes(normalizedSearchText);
    });
};
