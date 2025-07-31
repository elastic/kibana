/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { PublishingSubject } from '../publishing_subject';

/**
 * This API publishes a list of data views that it uses. Note that this should not contain any
 * ad-hoc data views.
 */
export interface PublishesDataViews {
  dataViews$: PublishingSubject<DataView[] | undefined>;
}

export type PublishesWritableDataViews = PublishesDataViews & {
  setDataViews: (dataViews: DataView[]) => void;
};

export const apiPublishesDataViews = (
  unknownApi: null | unknown
): unknownApi is PublishesDataViews => {
  return Boolean(unknownApi && (unknownApi as PublishesDataViews)?.dataViews$ !== undefined);
};
