/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { IndexPattern } from '../../../kibana_services';

export interface GridContext {
  viewed: number;
  setViewed: (id: number) => void;
  showSelected: boolean;
  setShowSelected: (value: boolean) => void;
  rows: ElasticSearchHit[];
  onFilter: DocViewFilterFn;
  indexPattern: IndexPattern;
}

const defaultContext = ({} as unknown) as GridContext;

export const DiscoverGridContext = React.createContext<GridContext>(defaultContext);
