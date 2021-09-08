/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DiscoverGridEmbeddable, DiscoverGridEmbeddableProps } from './saved_search_grid';
import { DiscoverDocTableEmbeddable } from '../apps/main/components/doc_table/create_doc_table_embeddable';
import { DocTableEmbeddableProps } from '../apps/main/components/doc_table/doc_table_embeddable';
import { SearchProps } from './saved_search_embeddable';

interface SavedSearchEmbeddableComponentProps {
  searchProps: SearchProps;
  useLegacyTable: boolean;
  refs: HTMLElement;
}

const DiscoverDocTableEmbeddableMemoized = React.memo(DiscoverDocTableEmbeddable);
const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

export function SavedSearchEmbeddableComponent({
  searchProps,
  useLegacyTable,
  refs,
}: SavedSearchEmbeddableComponentProps) {
  if (useLegacyTable) {
    const docTableProps = {
      ...searchProps,
      refs,
    };
    return <DiscoverDocTableEmbeddableMemoized {...(docTableProps as DocTableEmbeddableProps)} />;
  }
  const discoverGridProps = searchProps as DiscoverGridEmbeddableProps;
  return <DiscoverGridEmbeddableMemoized {...discoverGridProps} className="dscDiscoverGrid" />;
}
