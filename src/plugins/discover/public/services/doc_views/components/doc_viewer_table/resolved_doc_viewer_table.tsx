/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentType, LazyExoticComponent, useRef } from 'react';
import { DOC_TABLE_LEGACY } from '../../../../../common';
import { getServices } from '../../../../kibana_services';
import { DocViewRenderProps } from '../../doc_views_types';

const LegacyTable = React.lazy(() => import('./legacy'));
const Table = React.lazy(() => import('./table'));

export const ResolvedDocViewerTable = (props: DocViewRenderProps) => {
  const { uiSettings } = getServices();
  const componentRef = useRef<LazyExoticComponent<ComponentType<DocViewRenderProps>> | null>(null);
  componentRef.current = uiSettings.get(DOC_TABLE_LEGACY) ? LegacyTable : Table;

  const Component = componentRef.current;
  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};
