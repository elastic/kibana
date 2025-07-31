/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';

export type EmbeddableTransforms<
  StoredState extends object = object,
  State extends object = object
> = {
  transformOut?: (state: StoredState, references?: Reference[]) => State;
  transformIn?: (state: State) => {
    state: StoredState;
    references?: Reference[];
  };
};
