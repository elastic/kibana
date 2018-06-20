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

const FetchFieldsProvider = (Notifier, $http) => {
  const notify = new Notifier({ location: 'Metrics' });
  return (indexPatterns = ['*']) => {
    if (!Array.isArray(indexPatterns)) indexPatterns = [indexPatterns];
    return new Promise((resolve, reject) => {
      const fields = {};

      Promise.all(indexPatterns.map(pattern => {
        const httpResult = $http.get(`../api/metrics/fields?index=${pattern}`)
          .then(resp => resp.data)
          .catch(resp => { throw resp.data; });

        return httpResult
          .then(resp => {
            if (resp.length && pattern) {
              fields[pattern] = resp;
            }
          })
          .catch(resp => {
            const err = new Error(resp.message);
            err.stack = resp.stack;
            notify.error(err);
            reject(err);
          });
      })).then(() => {
        resolve(fields);
      });
    });
  };
};

export { FetchFieldsProvider };
