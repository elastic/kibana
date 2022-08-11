/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

const Fallback = () => <div />;

const LazySuggestionsComponent = React.lazy(() => import('./suggestions_component'));
export const SuggestionsComponent = (
  props: React.ComponentProps<typeof LazySuggestionsComponent>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazySuggestionsComponent {...props} />
  </React.Suspense>
);
