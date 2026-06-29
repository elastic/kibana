/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type {
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
  EventAnnotationGroupContent,
} from '@kbn/event-annotation-common';

export interface EventAnnotationServiceType {
  /** Emits the annotation group ID whenever a library annotation group is updated */
  annotationGroupUpdated$: Observable<string>;
  loadAnnotationGroup: (savedObjectId: string) => Promise<EventAnnotationGroupConfig>;
  groupExistsWithTitle: (title: string) => Promise<boolean>;
  /**
   * Searches `event-annotation-group` saved objects.
   *
   * When `pageSize` is omitted the underlying Content Management / Saved Objects
   * client falls back to its built-in `perPage` default — it is not an
   * unbounded fetch. Callers wired up to `ContentListClientProvider` should
   * forward `options.listingLimit` (resolved from the
   * `savedObjects:listingLimit` UI setting) instead of duplicating that lookup.
   */
  findAnnotationGroupContent: (
    searchTerm: string,
    pageSize?: number,
    tagsToInclude?: string[],
    tagsToExclude?: string[]
  ) => Promise<{ total: number; hits: EventAnnotationGroupContent[] }>;
  deleteAnnotationGroups: (ids: string[]) => Promise<void>;
  createAnnotationGroup: (group: EventAnnotationGroupConfig) => Promise<{ id: string }>;
  updateAnnotationGroup: (
    group: EventAnnotationGroupConfig,
    savedObjectId: string
  ) => Promise<void>;
  toExpression: (props: EventAnnotationConfig[]) => ExpressionAstExpression[];
  toFetchExpression: (props: {
    interval: string;
    groups: Array<
      Pick<EventAnnotationGroupConfig, 'annotations' | 'ignoreGlobalFilters' | 'indexPatternId'>
    >;
  }) => ExpressionAstExpression[];
  renderEventAnnotationGroupSavedObjectFinder: (props: {
    fixedPageSize?: number;
    onChoose: (value: {
      id: string;
      type: string;
      fullName: string;
      savedObject: SavedObjectCommon;
    }) => void;
    onCreateNew: () => void;
  }) => JSX.Element;
}
