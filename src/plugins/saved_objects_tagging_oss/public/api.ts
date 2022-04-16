/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { SearchFilterConfig, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import { SavedObject, SavedObjectReference } from '@kbn/core/types';
import { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { SavedObject as SavedObjectClass } from '@kbn/saved-objects-plugin/public';
import { TagDecoratedSavedObject } from './decorator';
import { ITagsClient, Tag } from '../common';

/**
 * @public
 */
export interface SavedObjectsTaggingApi {
  /**
   * The client to perform tag-related operations on the server-side
   */
  client: ITagsClient;
  /**
   * A client-side auto-refreshing cache of the existing tags. Can be used
   * to synchronously access the list of tags.
   */
  cache: ITagsCache;
  /**
   * UI API to use to add tagging capabilities to an application
   */
  ui: SavedObjectsTaggingApiUi;
}

/**
 * @public
 */
export interface ITagsCache {
  /**
   * Return the current state of the cache
   */
  getState(): Tag[];

  /**
   * Return an observable that will emit everytime the cache's state mutates.
   */
  getState$(): Observable<Tag[]>;
}

/**
 * @public
 */
export type SavedObjectTagDecoratorTypeGuard = SavedObjectsTaggingApiUi['hasTagDecoration'];

/**
 * React components and utility methods to use the SO tagging feature
 *
 * @public
 */
export interface SavedObjectsTaggingApiUi {
  /**
   * Return a Tag from an ID
   *
   * @param tagId
   */
  getTag(tagId: string): Tag | undefined;

  /**
   * Type-guard to safely manipulate tag-enhanced `SavedObject` from the `savedObject` plugin.
   *
   * @param object
   */
  hasTagDecoration(object: SavedObjectClass): object is TagDecoratedSavedObject;

  /**
   * Return a filter that can be used to filter by tag with `EuiSearchBar` or EUI tables using `EuiSearchBar`.
   *
   * @example
   * ```ts
   * // inside a react render
   * const filters = taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []
   * return (
   *  <EuiSearchBar {...props} filters={filters} />
   * )
   * ```
   */
  getSearchBarFilter(options?: GetSearchBarFilterOptions): SearchFilterConfig;

  /**
   * Return the column definition to be used to display the tags in a EUI table.
   * The table's items must be of the `SavedObject` type (or at least have their references available
   * via the `references` field)
   *
   * @example
   * ```ts
   * // inside a react render
   * const columns = [...myColumns, ...(taggingApi ? taggingApi.ui.getTableColumnDefinition() : [])];
   * return (
   *  <EuiBasicTable {...props} columns={columns} />
   * )
   * ```
   */
  getTableColumnDefinition(): EuiTableFieldDataColumnType<SavedObject>;

  /**
   * Convert given tag name to a {@link SavedObjectsFindOptionsReference | reference }
   * to be used to search using the savedObjects `_find` API. Will return `undefined`
   * if the given name does not match any existing tag.
   */
  convertNameToReference(tagName: string): SavedObjectsFindOptionsReference | undefined;

  /**
   * Parse given query using EUI's `Query` syntax, and return the search term and the tag references
   * to be used when using the `_find` API to retrieve the filtered objects.
   *
   * @remark if the query cannot be parsed, `searchTerm` will contain the raw query value, and `valid`
   *         will be `false`
   *
   * @param query The query to parse
   * @param options see {@link ParseSearchQueryOptions}
   *
   * @example
   * ```typescript
   * parseSearchQuery('tag:(tag-1 or tag-2) some term', { useNames: true })
   * >>
   * {
   *    searchTerm: 'some term',
   *    tagReferences: [{type: 'tag', id: 'tag-1-id'}, {type: 'tag', id: 'tag-2-id'}],
   *    valid: true,
   * }
   * ```
   *
   * @example
   * ```typescript
   * parseSearchQuery('tagging:(some-tag-uuid or some-other-tag-uuid) some term', { tagClause: 'tagging' })
   * >>
   * {
   *    searchTerm: 'some term',
   *    tagReferences: [{type: 'tag', id: 'some-tag-uuid'}, {type: 'tag', id: 'some-other-tag-uuid'}],
   *    valid: true,
   * }
   * ```
   *
   * @example
   * ```typescript
   * parseSearchQuery('tag:(tag-1) [foo]')
   * >>
   * {
   *    searchTerm: 'tag:(tag-1) [foo]',
   *    tagReferences: [],
   *    valid: false,
   * }
   * ```
   */
  parseSearchQuery(query: string, options?: ParseSearchQueryOptions): ParsedSearchQuery;

  /**
   * Returns the object ids for the tag references from given references array
   */
  getTagIdsFromReferences(
    references: Array<SavedObjectReference | SavedObjectsFindOptionsReference>
  ): string[];

  /**
   * Returns the id for given tag name. Will return `undefined`
   * if the given name does not match any existing tag.
   */
  getTagIdFromName(tagName: string): string | undefined;

  /**
   * Returns a new references array that replace the old tag references with references to the
   * new given tag ids, while preserving all non-tag references.
   */
  updateTagsReferences(
    references: SavedObjectReference[],
    newTagIds: string[]
  ): SavedObjectReference[];

  /**
   * {@link SavedObjectsTaggingApiUiComponent | React components} to support the tagging feature.
   */
  components: SavedObjectsTaggingApiUiComponent;
}

/**
 * React UI components to be used to display the tagging feature in any application.
 *
 * @public
 */
export interface SavedObjectsTaggingApiUiComponent {
  /**
   * Displays the tags for given saved object.
   */
  TagList: FunctionComponent<TagListComponentProps>;
  /**
   * Widget to select tags.
   */
  TagSelector: FunctionComponent<TagSelectorComponentProps>;
  /**
   * Component to be used with the `options` property of the `SavedObjectSaveModal` or `SavedObjectSaveModalOrigin`
   * modals from the `savedObjects` plugin. It displays the whole field row and handles the 'stateless' nature
   * of props passed to inline components
   */
  SavedObjectSaveModalTagSelector: FunctionComponent<SavedObjectSaveModalTagSelectorComponentProps>;
}

/**
 * Props type for the {@link SavedObjectsTaggingApiUiComponent.TagList | TagList component}
 *
 * @public
 */
export interface TagListComponentProps {
  /**
   * The object to display tags for.
   */
  object: SavedObject;
}

/**
 * Props type for the {@link SavedObjectsTaggingApiUiComponent.TagSelector | TagSelector component}
 *
 * @public
 */
export interface TagSelectorComponentProps {
  /**
   * Ids of the currently selected tags
   */
  selected: string[];
  /**
   * tags selection callback
   */
  onTagsSelected: (ids: string[]) => void;
}

/**
 * Props type for the {@link SavedObjectsTaggingApiUiComponent.SavedObjectSaveModalTagSelector | SavedObjectSaveModalTagSelector component}
 *
 * @public
 */
export interface SavedObjectSaveModalTagSelectorComponentProps {
  /**
   * Ids of the initially selected tags.
   * Changing the value of this prop after initial mount will not rerender the component (see component description for more details)
   */
  initialSelection: string[];
  /**
   * tags selection callback
   */
  onTagsSelected: (ids: string[]) => void;
}

/**
 * Options for the {@link SavedObjectsTaggingApiUi.getSearchBarFilter | getSearchBarFilter api}
 *
 * @public
 */
export interface GetSearchBarFilterOptions {
  /**
   * If set to true, will use the tag's `name` instead of `id` for the tag field clause, which is recommended
   * for a better end-user experience.
   *
   * Defaults to true.
   *
   * @example
   * ```
   * // query generated with { useName: true }
   * `tag:(tag-1 OR tag-2) my search term`
   * // query generated with { useName: false }
   * `tag:(d97721fc-542b-4485-a329-65ed04c84a4c OR d97721fc-542b-4485-a329-65ed04c84a4c) my search term`
   * ```
   *
   * @remarks this must consistent with the {@link ParseSearchQueryOptions.useName} when parsing the query.
   */
  useName?: boolean;
  /**
   * The tag clause field name to generate the query. Defaults to `tag`.
   *
   * @remarks It is very unlikely that this option is needed for external consumers.
   */
  tagField?: string;
}

/**
 * @public
 */
export interface ParsedSearchQuery {
  searchTerm: string;
  tagReferences: SavedObjectsFindOptionsReference[];
  valid: boolean;
}

/**
 * Options for the {@link SavedObjectsTaggingApiUi.parseSearchQuery | parseSearchQuery api}
 *
 * @public
 */
export interface ParseSearchQueryOptions {
  /**
   * If set to true, will assume the tag clause is using tag names instead of ids.
   * In that case, will perform a reverse lookup from the client-side tag cache to resolve tag ids from names.
   *
   * Defaults to true.
   *
   * @remarks this must be set to true if the filter is configured to use tag names instead of id in the query.
   *           see {@link GetSearchBarFilterOptions.useName} for more details.
   */
  useName?: boolean;
  /**
   * The tag clause field name to extract the tags from. Defaults to `tag`.
   *
   * @remarks It is very unlikely that this option is needed for external consumers.
   */
  tagField?: string;
}
