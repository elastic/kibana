/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import type { PublishingSubject } from '../publishing_subject';

/**
 * This API publishes the data sources (data views or ES|QL datasets) that it uses.
 * A panel that holds real `DataView`s declares `PublishesDataSources<DataView>`. Containers and filter UI
 * read the default `FilterableSource` view of the list.
 */
export interface PublishesDataSources<T extends FilterableSource = FilterableSource> {
  dataSources$: PublishingSubject<T[] | undefined>;
}

export type PublishesWritableDataSources<T extends FilterableSource = FilterableSource> =
  PublishesDataSources<T> & {
    setDataSources: (dataSources: T[]) => void;
  };

export const apiPublishesDataSources = (
  unknownApi: null | unknown
): unknownApi is PublishesDataSources => {
  return Boolean(unknownApi && (unknownApi as PublishesDataSources)?.dataSources$ !== undefined);
};
