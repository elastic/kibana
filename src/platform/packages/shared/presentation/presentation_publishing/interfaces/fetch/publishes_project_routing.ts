/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { PublishingSubject } from '../../publishing_subject';

export interface PublishesProjectRouting {
  projectRouting$: PublishingSubject<ProjectRouting | undefined>;
}

export const apiPublishesProjectRouting = (
  unknownApi: unknown
): unknownApi is PublishesProjectRouting => {
  return Boolean(
    unknownApi && (unknownApi as PublishesProjectRouting)?.projectRouting$ !== undefined
  );
};

export type ProjectRoutingOverrides =
  | {
      name?: string;
      value: string;
    }[]
  | undefined;

export interface PublishesProjectRoutingOverrides {
  projectRoutingOverrides$: PublishingSubject<ProjectRoutingOverrides>;
}

export const apiPublishesProjectRoutingOverrides = (
  unknownApi: unknown
): unknownApi is PublishesProjectRoutingOverrides => {
  return Boolean(
    unknownApi &&
      (unknownApi as PublishesProjectRoutingOverrides)?.projectRoutingOverrides$ !== undefined
  );
};
