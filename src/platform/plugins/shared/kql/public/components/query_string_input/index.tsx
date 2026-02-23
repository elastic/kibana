/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { QueryStringInputProps } from './query_string_input';

const Fallback = () => <div />;

const LazyQueryStringInputUI = React.lazy(async () => {
  const { QueryStringInput } = await import('./query_string_input');
  return { default: QueryStringInput };
});

export const QueryStringInput = (props: QueryStringInputProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryStringInputUI {...props} />
  </React.Suspense>
);

export type { QueryStringInputProps };
