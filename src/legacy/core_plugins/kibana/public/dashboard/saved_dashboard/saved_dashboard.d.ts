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

import { SavedObject } from 'ui/saved_objects/types';
import { ISearchSource } from '../../../../../ui/public/courier';
import { esFilters, Query, RefreshInterval } from '../../../../../../plugins/data/public';

export interface SavedObjectDashboard extends SavedObject {
  id?: string;
  copyOnSave: boolean;
  timeRestore: boolean;
  timeTo?: string;
  timeFrom?: string;
  title: string;
  description?: string;
  panelsJSON: string;
  optionsJSON?: string;
  // TODO: write a migration to rid of this, it's only around for bwc.
  uiStateJSON?: string;
  lastSavedTitle: string;
  searchSource: ISearchSource;
  destroy: () => void;
  refreshInterval?: RefreshInterval;
  getQuery(): Query;
  getFilters(): esFilters.Filter[];
}
