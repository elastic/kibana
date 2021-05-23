/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withEmbeddableSubscription } from '../../../../embeddable/public';
import { SearchInput, SearchOutput } from './types';
import { SavedSearchEmbeddable } from './saved_search_embeddable';
import { DiscoverGridEmbeddable } from '../components/create_discover_grid_directive';
import { DiscoverDocTableEmbeddable } from '../angular/doc_table/create_doc_table_react';

interface Props {
  input: SearchInput;
  output: SearchOutput;
  embeddable: SavedSearchEmbeddable;
}

export function SavedSearchEmbeddableComponentInner({
  input: { search },
  output: { attributes },
  embeddable,
  props,
}: Props) {
  const { useLegacyTable } = props;
  if (useLegacyTable) {
    return <DiscoverDocTableEmbeddable {...props} className="panel-content" />;
  }
  return <DiscoverGridEmbeddable {...props} className="dscDiscoverGrid" />;
}

export const SavedSearchEmbeddableComponent = withEmbeddableSubscription<
  SearchInput,
  SearchOutput,
  SavedSearchEmbeddable,
  {}
>(SavedSearchEmbeddableComponentInner);
