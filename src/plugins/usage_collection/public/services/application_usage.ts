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

import { Observable } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Reporter } from '@kbn/analytics';

/**
 * List of appIds not to report usage from (due to legacy hacks)
 */
const DO_NOT_REPORT = ['kibana'];

export function reportApplicationUsage(
  currentAppId$: Observable<string | undefined>,
  reporter: Reporter
) {
  currentAppId$
    .pipe(
      filter((appId) => typeof appId === 'string' && !DO_NOT_REPORT.includes(appId)),
      distinctUntilChanged()
    )
    .subscribe((appId) => appId && reporter.reportApplicationUsage(appId));
}
