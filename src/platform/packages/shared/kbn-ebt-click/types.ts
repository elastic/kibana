/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Shape of the `data-ebt-*` attributes for click tracking. */
export interface EbtClickAttrs {
  action: string;
  element: string;
  detail?: string;
}

/** For components that define `action` internally and expose the rest to consumers. */
export type EbtClickAttrsWithoutAction = Omit<EbtClickAttrs, 'action'>;

/** For components that define everything but the host `element` internally. */
export type EbtClickAttrsElementOnly = Pick<EbtClickAttrs, 'element'>;
