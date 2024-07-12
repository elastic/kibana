/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { type FieldDescriptionProps } from './field_description';

const LazyFieldDescription = React.lazy(() => import('./field_description'));
export const FieldDescription = withSuspense<FieldDescriptionProps>(LazyFieldDescription, <></>);
