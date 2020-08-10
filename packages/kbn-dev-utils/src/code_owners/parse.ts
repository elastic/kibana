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

import { teamName } from './helpers';

export const parseSourceOfTruth = (log: any) => (sourceOfTruth: []) => {
  const owners = new Map();

  for (const { title, githubHandle, pathPatterns, review = true } of sourceOfTruth) {
    const handle = `@${githubHandle}`;
    const team = teamName(githubHandle);

    for (const path of pathPatterns as []) {
      log.verbose(`\n### Parsing path: \n${path}`);
      const existing = owners.get(path);

      owners.set(path, {
        owners: existing ? [...existing.owners, handle] : [handle],
        teams: existing ? [...existing.teams, team] : [team],
        title,
        review,
      });
    }
  }

  return owners;
};
