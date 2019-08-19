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

import _ from 'lodash';
import moment from 'moment';
import HTTP from '@logrhythm/nm-web-shared/common/http';

const innerHttp = new HTTP();

const indexDatePattern = 'YYYY_MM_DD';

export type QueryRuleSeverity = '' | 'low' | 'medium' | 'high';

export interface QueryRule {
  id: string;
  severity: QueryRuleSeverity;
  query: string;
}

const getTriggerCountQueryBody = (query: string, from: moment.Moment, to: moment.Moment) => ({
  query: {
    bool: {
      filter: {
        range: {
          TimeUpdated: {
            from: from.format(),
            to: to.format(),
          },
        },
      },
      must: {
        query_string: {
          query,
        },
      },
    },
  },
});

export const getTriggerCount = async (query: string): Promise<number> => {
  const mappingRes = await innerHttp.fetch('/api/metadata/fieldmap');
  const mappings = await mappingRes.json();

  if (!mappingRes || !mappingRes.ok || _.isEmpty(mappings)) {
    throw new Error('An error occurred looking up the field mappings.');
  }

  const from = moment.utc().subtract(1, 'day');
  const to = moment.utc();

  const possibleIndices = [from, to].map(d => `network_${d.format(indexDatePattern)}`);

  const indexRes = await innerHttp.fetch('/_aliases');
  const indices = await indexRes.json();

  if (!indexRes || !indexRes.ok || _.isEmpty(indices)) {
    throw new Error('An error occurred looking up the index list.');
  }

  const indicesToCheck = _.intersection(Object.keys(indices), possibleIndices);

  if (indicesToCheck.length === 0) {
    return 0;
  }

  const triggerCountQueryBody = getTriggerCountQueryBody(query, from, to);

  const indexLookups = indicesToCheck.map(i =>
    innerHttp.fetch(`/${i}/_count`, {
      method: 'POST',
      body: JSON.stringify(triggerCountQueryBody),
    })
  );

  const triggerCountLookupRes = await Promise.all(indexLookups);
  const triggerCountLookupJsonPromises = triggerCountLookupRes.map(r => {
    if (!r.ok) {
      throw new Error('One of the trigger count lookups was unsuccessful.');
    }

    return r.json();
  });

  const triggerCountLookupJson = await Promise.all(triggerCountLookupJsonPromises);
  return triggerCountLookupJson.reduce((agg, tc) => {
    if (_.isEmpty(tc)) {
      throw new Error('One of the trigger count lookup results could not be parsed to json.');
    }

    return agg + (tc.count || 0);
  }, 0);
};

export const save = async (queryRule: QueryRule): Promise<void> => {
  if (!queryRule.id) {
    return;
  }

  const queryRuleBody = {
    ...queryRule,
    enabled: true,
  };

  const saveRes = await innerHttp.fetch(`/api/queryRules/${queryRule.id}`, {
    method: 'PUT',
    body: JSON.stringify(queryRuleBody),
  });

  if (!saveRes || !saveRes.ok) {
    throw new Error('An error occurred saving the query rule.');
  }
};
