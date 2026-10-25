/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import type { InspectorViewProps } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';

const QueryProfileView = lazy(() =>
  import('./query_profile_view').then((module) => ({ default: module.QueryProfileView }))
);

/** Returns the lazy panel registered as the Query profile inspector view. */
export const getQueryProfileViewComponent =
  (getStartServices: () => { search: ISearchStart }) => (props: InspectorViewProps) =>
    (
      <QueryProfileView
        adapters={props.adapters}
        title={props.title}
        options={props.options}
        search={getStartServices().search}
      />
    );
