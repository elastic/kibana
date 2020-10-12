/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SearchFilterConfig, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import { SavedObject } from '../../../core/types';
import { SavedObjectsFindOptionsReference } from '../../../core/public';
import { ITagsClient } from '../common';

export interface TaggingApi {
  client: ITagsClient;
  ui: TaggingApiUi;
}

export interface TagListComponentProps {
  /**
   * The object to display tags for.
   */
  object: SavedObject;
}

export interface GetSearchBarFilterOptions {
  /**
   * The field that will be used as value when an option is selected. Can either
   * be `id` or `name`.
   * Default to `id`
   */
  valueField?: 'id' | 'name';
}

export interface ParsedSearchQuery {
  searchTerm: string;
  tagReferences?: SavedObjectsFindOptionsReference[];
}

export interface ParseSearchQueryOptions {
  /**
   * If set to true, will assume the tag clause is using tag names instead of ids.
   * In that case, will perform a reverse lookup from the client-side tag cache to resolve tag ids from names.
   *
   * Defaults to false.
   *
   * @remarks this must be set to to true if the filter is configured to use tag names instead of id in the query.
   *           see {@link GetSearchBarFilterOptions.valueField} for more details.
   */
  useName?: boolean;
  /**
   * The tag clause field name to extract the tags from. Defaults to `tag`.
   *
   * @remarks It is very unlikely that this option is needed for external consumers.
   */
  tagClause?: string;
}

/**
 * React components and utility methods to use the SO tagging feature
 */
export interface TaggingApiUi {
  /**
   * Returns a filter that can be used by filter by tag with `EuiSearchBar` or EUI tables using `EuiSearchBar`.
   */
  getSearchBarFilter(options?: GetSearchBarFilterOptions): SearchFilterConfig;

  /**
   * Return the column definition to be used to display the tags in a EUI table.
   * The table's items must be of the `SavedObject` type (or at least have their references available
   * via the `references` field)
   */
  getTableColumnDefinition(): EuiTableFieldDataColumnType<SavedObject>;

  /**
   * Converts given tag name to a reference to be used to search using the _find API.
   */
  convertNameToReference(tagName: string): SavedObjectsFindOptionsReference | undefined;

  /**
   * Parse given query using EUI's `Query` syntax, and returns the search term and the tag references
   * to be used when using the `_find` API.
   *
   * @param query The query to parse
   * @param options see {@link ParseSearchQueryOptions}
   *
   * @example
   * ```typescript
   * parseSearchQuery('(tag:(tag-1 or tag-2) some term', { useNames: true })
   * >>
   * {
   *    searchTerm: 'some term',
   *    tagReferences: [{type: 'tag', id: 'tag-1-id'}, {type: 'tag', id: 'tag-2-id'}]
   * }
   * ```
   *
   * @example
   * ```typescript
   * parseSearchQuery('(tagging:(some-tag-uuid or some-other-tag-uuid) some term', { tagClause: 'tagging' })
   * >>
   * {
   *    searchTerm: 'some term',
   *    tagReferences: [{type: 'tag', id: 'some-tag-uuid'}, {type: 'tag', id: 'some-other-tag-uuid'}]
   * }
   * ```
   */
  parseSearchQuery(query: string, options?: ParseSearchQueryOptions): ParsedSearchQuery;

  /**
   * React component to support the tagging feature.
   */
  components: {
    /**
     * Displays the tags for given saved object.
     */
    TagList: FunctionComponent<TagListComponentProps>;
  };
}
