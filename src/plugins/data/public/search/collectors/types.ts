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

export enum SEARCH_EVENT_TYPE {
  QUERY_TIMED_OUT = 'queryTimedOut',
  QUERIES_CANCELLED = 'queriesCancelled',
  LONG_QUERY_POPUP_SHOWN = 'longQueryPopupShown',
  LONG_QUERY_DIALOG_DISMISSED = 'longQueryDialogDismissed',
  LONG_QUERY_RUN_BEYOND_TIMEOUT = 'longQueryRunBeyondTimeout',
}

export interface SearchUsageCollector {
  trackQueryTimedOut: () => Promise<void>;
  trackQueriesCancelled: () => Promise<void>;
  trackLongQueryPopupShown: () => Promise<void>;
  trackLongQueryDialogDismissed: () => Promise<void>;
  trackLongQueryRunBeyondTimeout: () => Promise<void>;
  trackError: (duration: number) => Promise<void>;
  trackSuccess: (duration: number) => Promise<void>;
}
