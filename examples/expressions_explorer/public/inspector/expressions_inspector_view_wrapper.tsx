/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';

const ExpressionsInspectorViewComponent = lazy(() => import('./expressions_inspector_view'));

export const getExpressionsInspectorViewComponentWrapper = () => {
  return (props: any) => {
    return <ExpressionsInspectorViewComponent adapters={props.adapters} title={props.title} />;
  };
};
