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

export interface TimelionAppState {
  sheet: string[];
  selected: number;
  columns: number;
  rows: number;
  interval: string;
}

export interface TimelionAppStateTransitions {
  set: (
    state: TimelionAppState
  ) => <T extends keyof TimelionAppState>(prop: T, value: TimelionAppState[T]) => TimelionAppState;
  updateState: (
    state: TimelionAppState
  ) => <T extends keyof TimelionAppState>(newValues: Partial<TimelionAppState>) => TimelionAppState;
}
