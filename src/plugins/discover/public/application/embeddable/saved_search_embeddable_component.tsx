/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { SearchProps } from './saved_search_embeddable';
import { DiscoverGridEmbeddable } from '../components/create_discover_grid_directive';
import {
  DiscoverDocTableEmbeddable,
  DocTableEmbeddableProps,
} from '../angular/doc_table/create_doc_table_embeddable';
import { DiscoverGridProps } from '../components/discover_grid/discover_grid';

export function SavedSearchEmbeddableComponent(props: SearchProps) {
  const { useLegacyTable } = props;
  if (useLegacyTable) {
    const docTableProps = props as DocTableEmbeddableProps;
    return <DiscoverDocTableEmbeddable {...docTableProps} />;
  }
  const discoverGridProps = props as DiscoverGridProps;
  return <DiscoverGridEmbeddable {...discoverGridProps} className="dscDiscoverGrid" />;
}

export const SavedSearchEmbeddableComponentMemoized = React.memo(SavedSearchEmbeddableComponent);
