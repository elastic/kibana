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

import { get, omit } from 'lodash';

const migrations = {
  visualization: {
    '7.0.0': (doc) => {
      try {
        const visState = JSON.parse(doc.attributes.visState);
        if (get(visState, 'type') !== 'table') {
          return doc; // do nothing; we only want to touch tables
        }

        let splitFound = false;
        visState.aggs = visState.aggs.map(agg => {
          if (agg.schema === 'split') {
            if (!splitFound) {
              splitFound = true;
              return agg; // leave the first split agg unchanged
            }
            agg.schema = 'bucket';
            // the `row` param is exclusively used by split aggs, so we remove it
            agg.params = omit(agg.params, ['row']);
          }
          return agg;
        });

        doc.attributes.visState = JSON.stringify(visState);
        return doc;
      }
      catch (e) {
        // if anything goes wrong, do nothing and move on
        return doc;
      }
    }
  }
};

export default migrations;
