/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ShardFailureOpenModalButtonProps } from './shard_failure_open_modal_button';

const Fallback = () => <div />;

const LazyShardFailureOpenModalButton = React.lazy(
  () => import('./shard_failure_open_modal_button')
);
export const ShardFailureOpenModalButton = (props: ShardFailureOpenModalButtonProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyShardFailureOpenModalButton {...props} />
  </React.Suspense>
);

export type { ShardFailureRequest } from './shard_failure_types';
