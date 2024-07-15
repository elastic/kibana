/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import type { FieldDescriptionProps } from './field_description';

const Fallback = () => <Fragment />;

const LazyFieldDescription = React.lazy(() => import('./field_description'));

function WrappedFieldDescription(props: FieldDescriptionProps) {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyFieldDescription {...props} />
    </React.Suspense>
  );
}

export const FieldDescription = WrappedFieldDescription;
