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

import { SearchSource } from 'ui/courier';
import { SavedObject } from 'ui/saved_objects/saved_object';
import moment from 'moment';
import { RefreshInterval } from 'ui/timefilter/timefilter';

export interface SavedObjectDashboard extends SavedObject {
  id?: string;
  copyOnSave: boolean;
  timeRestore: boolean;
  // These optionally being moment objects rather than strings seems more like a bug than by design. It's due to
  // some code in udpate_saved_dashboard that should probably get cleaned up.
  timeTo: string | moment.Moment | undefined;
  timeFrom: string | moment.Moment | undefined;
  title: string;
  description?: string;
  panelsJSON: string;
  optionsJSON: string | undefined;
  // TODO: write a migration to rid of this, it's only around for bwc.
  uiStateJSON?: string;
  lastSavedTitle: string;
  searchSource: SearchSource;
  destroy: () => void;
  refreshInterval?: RefreshInterval;
}
