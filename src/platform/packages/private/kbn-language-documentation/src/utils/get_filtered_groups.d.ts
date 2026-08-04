import type { DocumentationGroup, LanguageDocumentationSections } from '../types';
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
export declare const getFilteredGroups: (searchText: string, searchInDescription?: boolean, sections?: LanguageDocumentationSections, numOfGroupsToOmit?: number, highlightMatchingText?: boolean) => DocumentationGroup[];
