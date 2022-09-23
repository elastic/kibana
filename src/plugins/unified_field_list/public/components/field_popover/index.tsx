/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import type { FieldPopoverProps } from './field_popover';

const Fallback = () => <Fragment />;

const LazyFieldPopover = React.lazy(() => import('./field_popover'));
const WrappedFieldPopover: React.FC<FieldPopoverProps> = (props) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFieldPopover {...props} />
  </React.Suspense>
);

export const FieldPopover = WrappedFieldPopover;
export type { FieldPopoverProps };
