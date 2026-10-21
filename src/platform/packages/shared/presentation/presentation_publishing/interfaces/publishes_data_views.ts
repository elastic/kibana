/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { FilterableSource } from '@kbn/data-source';
import type { PublishingSubject } from '../publishing_subject';

/**
 * This API publishes a list of data views that it uses. A data view is one entry, and so is the
 * filterable source of an ES|QL dataset (`source.toFilterableSource()`), which has no data view.
 * Code that reads the list of another panel can rely on an id, a title, a time field and the fields
 * to filter on, not on the rest of a `DataView`.
 */
export interface PublishesDataViews {
  dataViews$: PublishingSubject<FilterableSource[] | undefined>;
}

/**
 * Publishes data views only, never the filterable source of an ES|QL dataset. A panel that reads the
 * list it publishes itself says so with this interface, and keeps the `DataView` members, for example
 * `isPersisted()`. It is a `PublishesDataViews`, so anything that reads the list still accepts it.
 */
export interface PublishesOnlyDataViews {
  dataViews$: PublishingSubject<DataView[] | undefined>;
}

/**
 * Publishes data views only, and lets the panel change them.
 */
export interface PublishesWritableDataViews extends PublishesOnlyDataViews {
  setDataViews: (dataViews: DataView[]) => void;
}

export const apiPublishesDataViews = (
  unknownApi: null | unknown
): unknownApi is PublishesDataViews => {
  return Boolean(unknownApi && (unknownApi as PublishesDataViews)?.dataViews$ !== undefined);
};
