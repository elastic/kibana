/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

const Fallback = () => <div />;

const LazySuggestionsComponent = React.lazy(async () => {
  const { SuggestionsComponent } = await import('../ui_module');
  return { default: SuggestionsComponent };
});
export const SuggestionsComponent = (
  props: React.ComponentProps<typeof LazySuggestionsComponent>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazySuggestionsComponent {...props} />
  </React.Suspense>
);
