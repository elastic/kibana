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

import { left, right } from '../code_coverage/ingest_coverage/either';
import { teamName, hasPath } from './helpers';

export const parseSourceOfTruth = (log) => (sourceOfTruth) => {
  const init = new Map();

  const owners = sourceOfTruth.reduce(
    (acc, { title, githubHandle, pathPatterns, review = true }) => {
      const handle = `@${githubHandle}`;
      const team = teamName(githubHandle);

      pathPatterns.forEach((path) => {
        log.verbose(`\n### Parsing path: \n${path}`);
        const whetherHasPath = hasPath(path)(acc) ? right(acc) : left(acc);

        const mutateOwnersAndTeams = (path) => (accObj) => {
          const { owners: currOwners, teams: currTeams } = accObj.get(path);

          accObj.set(path, {
            owners: currOwners.concat(handle),
            teams: currTeams.concat(team),
            title,
            review,
          });
        };

        const addNew = (path) => (accObj) =>
          accObj.set(path, {
            owners: [handle],
            teams: [team],
            title,
            review,
          });

        whetherHasPath.fold(addNew(path), mutateOwnersAndTeams(path));
      });

      return acc;
    },
    init
  );

  return owners;
};
