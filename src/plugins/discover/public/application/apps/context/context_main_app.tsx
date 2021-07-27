/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { History } from 'history';
import { useParams } from 'react-router-dom';
import { IndexPattern, IndexPatternAttributes, SavedObject } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { ContextApp } from '../../components/context_app/context_app';

export interface ContextMainProps {
  /**
   * Instance of browser history
   */
  history: History;
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
  /**
   * Current instance of SavedSearch
   */
  savedSearch: SavedSearch;
}

export interface ContextUrlParams {
  indexPatternId: string;
  id: string;
}

export function ContextMainApp(props: ContextMainProps) {
  const { services } = props;

  const { indexPatternId, id } = useParams<ContextUrlParams>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);

  async function getIndexPattern() {
    const ip = await services.indexPatterns.get(indexPatternId);
    setIndexPattern(ip);
  }

  getIndexPattern();

  if (!indexPattern) {
    return null;
  }

  return <ContextApp indexPatternId={indexPatternId} anchorId={id} indexPattern={indexPattern} />;
}
