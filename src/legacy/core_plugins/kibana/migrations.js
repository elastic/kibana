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

import { get } from 'lodash';

function removeDateHistogramTimeZones(doc) {
  const visStateJSON = get(doc, 'attributes.visState');
  if (visStateJSON) {
    let visState;
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.aggs) {
      visState.aggs.forEach(agg => {
        // We're checking always for the existance of agg.params here. This should always exist, but better
        // be safe then sorry during migrations.
        if (agg.type === 'date_histogram' && agg.params) {
          delete agg.params.time_zone;
        }

        if (get(agg, 'params.customBucket.type', null) === 'date_histogram' && agg.params.customBucket.params) {
          delete agg.params.customBucket.params.time_zone;
        }
      });
      doc.attributes.visState = JSON.stringify(visState);
    }
  }
  return doc;
}

export const migrations = {
  visualization: {
    /**
     * We need to have this migration twice, once with a version prior to 7.0.0 once with a version
     * after it. The reason for that is, that this migration has been introduced once 7.0.0 was already
     * released. Thus a user who already had 7.0.0 installed already got the 7.0.0 migrations below running,
     * so we need a version higher than that. But this fix was backported to the 6.7 release, meaning if we
     * would only have the 7.0.1 migration in here a user on the 6.7 release will migrate their saved objects
     * to the 7.0.1 state, and thus when updating their Kibana to 7.0, will never run the 7.0.0 migrations introduced
     * in that version. So we apply this twice, once with 6.7.2 and once with 7.0.1 while the backport to 6.7
     * only contained the 6.7.2 migration and not the 7.0.1 migration.
     */
    '6.7.2': removeDateHistogramTimeZones,
  },
};
