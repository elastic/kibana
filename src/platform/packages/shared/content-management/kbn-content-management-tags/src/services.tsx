/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useCallback,
  useContext,
  type FC,
  type PropsWithChildren,
} from 'react';

import { Query } from '@elastic/eui';

import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { IToasts } from '@kbn/core-notifications-browser';

import type { ParsedQuery, Tag } from './types';

/**
 * Core services interface for content management tags functionality.
 *
 * @property getTagList - Synchronously retrieves the list of all available tags.
 * @property parseSearchQuery - Optional function to parse a search query string and extract tag filters.
 * @property onError - Optional error handler for reporting errors to the user. Defaults to noop.
 */
interface Services {
  getTagList: () => Tag[];
  parseSearchQuery?: (searchQuery: string) => ParsedQuery;
  /** Optional error handler for reporting errors to the user. Defaults to noop. */
  onError?: (error: Error, title: string) => void;
}

/**
 * Public type alias for the content management tags services interface.
 *
 * Use this type when implementing custom service providers or when type-checking
 * service objects passed to {@link ContentManagementTagsProvider}.
 */
export type ContentManagementTagsServices = Services;

/**
 * Dependencies required from Kibana plugins to enable content management tags functionality.
 *
 * This interface defines the contract between the content management tags package and
 * the Kibana plugin ecosystem. Consumers should provide these dependencies when using
 * {@link ContentManagementTagsKibanaProvider}.
 *
 * @example
 * ```tsx
 * const dependencies: ContentManagementTagsKibanaDependencies = {
 *   savedObjectsTagging: {
 *     ui: savedObjectsTaggingOss.getTaggingApi().ui,
 *   },
 *   core: {
 *     notifications: coreStart.notifications,
 *   },
 * };
 * ```
 */
export interface ContentManagementTagsKibanaDependencies {
  /** Tagging UI utilities from the saved objects tagging plugin. */
  savedObjectsTagging: {
    ui: Pick<
      SavedObjectsTaggingApiUi,
      'getTagList' | 'parseSearchQuery' | 'getSearchBarFilter' | 'getTagIdFromName'
    >;
  };
  /** Core Kibana services including notifications for error reporting. */
  core: {
    notifications: {
      toasts: Pick<IToasts, 'addError'>;
    };
  };
}

const ContentManagementTagsContext = createContext<Services | null>(null);

/**
 * Pure parsing logic for extracting tag filters from a search query.
 *
 * This function is intentionally defined outside the component to avoid
 * recreation on each render. It contains no dependencies on React state
 * or callbacks.
 *
 * @param searchQuery - The raw search query string to parse.
 * @param tags - The list of available tags to resolve names against.
 * @returns Parsed query with extracted tag IDs and cleaned search text.
 */
/**
 * Resolves tag names to tag IDs using the provided tag list.
 *
 * @param tagNames - Array of tag names to resolve.
 * @param tags - The list of available tags to match against.
 * @returns Array of resolved tag IDs.
 */
const resolveTagNamesToIds = (tagNames: string[], tags: Tag[]): string[] => {
  const tagIds: string[] = [];
  tagNames.forEach((tagName) => {
    const tag = tags.find((t) => t.name === tagName);
    if (tag?.id) {
      tagIds.push(tag.id);
    }
  });
  return tagIds;
};

const parseSearchQueryCore = (searchQuery: string, tags: Tag[]): ParsedQuery => {
  // Parse the EUI Query syntax with a schema that recognises the tag field.
  // Use strict: false to allow other field clauses (createdBy, is:favorite, etc.)
  // while still extracting tag clauses.
  const query = Query.parse(searchQuery, {
    schema: {
      strict: false,
      fields: {
        tag: {
          type: 'string',
        },
      },
    },
  });

  // Resolve tag names to IDs.
  const tagIds: string[] = [];
  const tagIdsToExclude: string[] = [];

  // Handle regular field clauses (e.g., `tag:value`).
  const tagClauses = query.ast.getFieldClauses('tag');
  if (tagClauses) {
    tagClauses.forEach((clause) => {
      const tagNames = Array.isArray(clause.value) ? clause.value : [clause.value];
      // Cast to string[] since tag field is defined as type: 'string' in schema.
      const resolvedIds = resolveTagNamesToIds(tagNames as string[], tags);

      if (clause.match === 'must') {
        tagIds.push(...resolvedIds);
      } else if (clause.match === 'must_not') {
        tagIdsToExclude.push(...resolvedIds);
      }
    });
  }

  // Handle OR-field clauses (e.g., `tag:(value)` or `tag:(value1 or value2)`).
  // EUI Query treats parenthesis syntax differently from simple field syntax.
  const includeOrClause = query.ast.getOrFieldClause('tag', undefined, true, 'eq');
  if (includeOrClause) {
    const tagNames = Array.isArray(includeOrClause.value)
      ? includeOrClause.value
      : [includeOrClause.value];
    const resolvedIds = resolveTagNamesToIds(tagNames as string[], tags);
    tagIds.push(...resolvedIds);
  }

  const excludeOrClause = query.ast.getOrFieldClause('tag', undefined, false, 'eq');
  if (excludeOrClause) {
    const tagNames = Array.isArray(excludeOrClause.value)
      ? excludeOrClause.value
      : [excludeOrClause.value];
    const resolvedIds = resolveTagNamesToIds(tagNames as string[], tags);
    tagIdsToExclude.push(...resolvedIds);
  }

  // Deduplicate tag IDs since the same tag may be matched by both
  // getFieldClauses and getOrFieldClause for certain query formats.
  const uniqueTagIds = [...new Set(tagIds)];
  const uniqueTagIdsToExclude = [...new Set(tagIdsToExclude)];

  // Remove tag clauses from search query to get clean search term.
  const cleanQuery = query.removeOrFieldClauses('tag');
  const hasResolvedTags = uniqueTagIds.length > 0 || uniqueTagIdsToExclude.length > 0;

  if (!hasResolvedTags) {
    // If no tag IDs could be resolved, fall back to the original query text.
    return {
      searchQuery,
      tagIds: undefined,
      tagIdsToExclude: undefined,
    };
  }

  return {
    searchQuery: cleanQuery.text,
    tagIds: uniqueTagIds.length > 0 ? uniqueTagIds : undefined,
    tagIdsToExclude: uniqueTagIdsToExclude.length > 0 ? uniqueTagIdsToExclude : undefined,
  };
};

/**
 * Context provider for content management tags services.
 *
 * Use this provider when you want to supply custom tag services directly,
 * without integrating with Kibana's saved objects tagging plugin.
 *
 * For Kibana plugin integration, use {@link ContentManagementTagsKibanaProvider} instead.
 *
 * @example
 * ```tsx
 * <ContentManagementTagsProvider
 *   getTagList={() => myTags}
 *   parseSearchQuery={(query) => parseMyQuery(query)}
 *   onError={(err, title) => console.error(title, err)}
 * >
 *   <MyApp />
 * </ContentManagementTagsProvider>
 * ```
 */
export const ContentManagementTagsProvider: FC<PropsWithChildren<ContentManagementTagsServices>> = (
  props: PropsWithChildren<ContentManagementTagsServices>
) => {
  const { children, getTagList, parseSearchQuery, onError } = props;

  return (
    <ContentManagementTagsContext.Provider value={{ getTagList, parseSearchQuery, onError }}>
      {children}
    </ContentManagementTagsContext.Provider>
  );
};

/**
 * Kibana-integrated context provider for content management tags services.
 *
 * This provider adapts Kibana's saved objects tagging plugin API to the content management
 * tags interface. It automatically handles tag list retrieval, search query parsing with
 * EUI Query syntax support, and error reporting via toast notifications.
 *
 * Use this provider in Kibana plugins that need tag functionality. For standalone usage
 * without Kibana dependencies, use {@link ContentManagementTagsProvider} instead.
 *
 * @example
 * ```tsx
 * // In a Kibana plugin's application component
 * <ContentManagementTagsKibanaProvider
 *   savedObjectsTagging={{ ui: savedObjectsTaggingOss.getTaggingApi().ui }}
 *   core={{ notifications: coreStart.notifications }}
 * >
 *   <MyKibanaApp />
 * </ContentManagementTagsKibanaProvider>
 * ```
 */
export const ContentManagementTagsKibanaProvider: FC<
  PropsWithChildren<ContentManagementTagsKibanaDependencies>
> = (props: PropsWithChildren<ContentManagementTagsKibanaDependencies>) => {
  const {
    children,
    savedObjectsTagging: {
      ui: { getTagList: getTagListFn },
    },
    core: {
      notifications: {
        toasts: { addError },
      },
    },
  } = props;

  const onError = useCallback(
    (error: Error, title: string) => {
      addError(error, { title });
    },
    [addError]
  );

  const getTagList = useCallback(() => {
    try {
      return getTagListFn();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)), 'Error fetching tag list');
      return [];
    }
  }, [getTagListFn, onError]);

  const parseSearchQuery = useCallback(
    (searchQuery: string): ParsedQuery => {
      try {
        const tags = getTagListFn();
        return parseSearchQueryCore(searchQuery, tags);
      } catch (error) {
        onError(
          error instanceof Error ? error : new Error(String(error)),
          'Error parsing search query for tags'
        );
        // If parsing fails, return the original query.
        return {
          searchQuery,
          tagIds: undefined,
          tagIdsToExclude: undefined,
        };
      }
    },
    [getTagListFn, onError]
  );

  const value: Services = {
    getTagList,
    parseSearchQuery,
    onError,
  };

  return <ContentManagementTagsProvider {...value}>{children}</ContentManagementTagsProvider>;
};

/**
 * Hook to access content management tags services from the context.
 *
 * Returns the services object if used within a `ContentManagementTagsProvider`,
 * or `undefined` if the context is not available. This allows components to
 * gracefully handle scenarios where tags support may not be configured.
 *
 * @returns The `Services` object containing `getTagList` and optionally `parseSearchQuery`,
 *          or `undefined` if no provider is present in the component tree.
 *
 * @example
 * ```tsx
 * const services = useServices();
 *
 * // Check if services are available before using
 * if (services) {
 *   const tags = services.getTagList();
 * }
 * ```
 */
export const useServices = (): Services | undefined => {
  return useContext(ContentManagementTagsContext) ?? undefined;
};
