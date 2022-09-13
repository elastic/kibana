/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  DiscoverSidebarResponsiveProps,
  DiscoverSidebarResponsive,
} from './discover_sidebar_responsive';
import { useSidebarData } from '../../hooks/use_sidebar_data';
import { AvailableFields$, DataDocuments$ } from '../../hooks/use_saved_search';

interface ContainerProps {
  documents$: DataDocuments$;
  availableFields$: AvailableFields$;
}

type DiscoverSidebarContainerProps = ContainerProps & DiscoverSidebarResponsiveProps;

/**
 * Container component for DiscoverSidebarResponsive
 */
export function DiscoverSidebarContainer(props: DiscoverSidebarContainerProps) {
  const { documents$, availableFields$, selectedDataView, columns } = props;

  const sidebarData = useSidebarData({
    documents$,
    availableFields$,
    selectedDataView,
    columns,
  });

  return <DiscoverSidebarResponsive {...props} {...sidebarData} />;
}
