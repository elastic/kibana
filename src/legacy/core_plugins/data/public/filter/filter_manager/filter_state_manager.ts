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

import { Filter } from '@kbn/es-query';

import _ from 'lodash';
import { Observable, Subject } from 'rxjs';
import { State } from 'ui/state_management/state';
import { PartitionedFilters } from './partitioned_filters';

export class FilterStateManager {
  globalState: State;
  getAppState: () => State;
  prevGlobalFilters: Filter[] | undefined;
  prevAppFilters: Filter[] | undefined;
  stateUpdated$: Subject<PartitionedFilters> = new Subject();

  constructor(globalState: State, getAppState: () => State) {
    this.getAppState = getAppState;
    this.globalState = globalState;

    this.watchFilterState();
  }

  private watchFilterState() {
    // This is a temporary solution to remove rootscope.
    // Moving forward, state should provide observable subscriptions.
    setInterval(() => {
      const appState = this.getAppState();
      if (
        !appState ||
        !this.globalState ||
        (this.prevGlobalFilters &&
          _.isEqual(this.prevGlobalFilters, this.globalState.filters) &&
          this.prevAppFilters &&
          _.isEqual(this.prevAppFilters, appState.filters))
      )
        return;

      this.stateUpdated$.next({
        appFilters: appState.filters || [],
        globalFilters: this.globalState.filters || [],
      });

      // store new filter changes
      this.prevGlobalFilters = _.cloneDeep(this.globalState.filters);
      this.prevAppFilters = _.cloneDeep(appState.filters);
    }, 10);
  }

  private saveState() {
    const appState = this.getAppState();
    if (appState) appState.save();
    this.globalState.save();
  }

  public getStateUpdated$(): Observable<PartitionedFilters> {
    return this.stateUpdated$.asObservable();
  }

  public updateAppState(partitionedFilters: PartitionedFilters) {
    // Update Angular state before saving State objects (which save it to URL)
    const appState = this.getAppState();
    appState.filters = partitionedFilters.appFilters;
    this.globalState.filters = partitionedFilters.globalFilters;
    this.saveState();
  }
}
