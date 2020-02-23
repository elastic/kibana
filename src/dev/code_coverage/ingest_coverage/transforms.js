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

import { left, right } from './either';

const XPACK = 'x-pack';

export const trimLeftFrom = (text, x) => x.replace(new RegExp(`(?:.*)(${text}.*$)`, 'gm'), '$1');

export const staticSite = urlBase => obj => {
  const { BUILD_ID, coveredFilePath } = obj;
  const ts = obj['@timestamp'];

  const maybeTotal = coveredFilePath === 'total' ?
    left(coveredFilePath) : right(coveredFilePath);

  const assignAndReturn = x => {
    obj.coveredFilePath = x;
    return obj;
  };

  return maybeTotal
    .map(coveredFilePath => trimLeftFrom('kibana', coveredFilePath))
    .map(trimmed => `${urlBase}/${BUILD_ID}/${ts}/${trimmed}`)
    .fold(assignAndReturn, assignAndReturn);
};
export const statsAndCoveredFilePath = (...xs) => {
  const [coveredFilePath] = xs[0][1];
  const [stats] = xs[0];
  return {
    coveredFilePath,
    ...stats,
  };
};
export const addCoverageSummaryPath = coverageSummaryPath => obj => ({
  coverageSummaryPath: trimLeftFrom('target', coverageSummaryPath),
  ...obj,
});

export const truncate = text => obj => {
  const { coveredFilePath } = obj;
  if (coveredFilePath.includes(text)) obj.coveredFilePath = trimLeftFrom(text, coveredFilePath);
  return obj;
};

export const addTimeStamp = ts => obj => ({
  ...obj,
  '@timestamp': ts,
});

export const distro = obj => {
  const { coveredFilePath } = obj;
  let distro;
  if (process.env.DISTRO) {
    distro = process.env.DISTRO;
  } else {
    distro = coveredFilePath.includes(XPACK) ? XPACK : 'OSS';
  }

  return {
    ...obj,
    distro,
  };
};

export const testRunner = obj => {
  const { coverageSummaryPath } = obj;

  let coverageType = 'other';

  ['mocha', 'jest', 'functional']
    .forEach(x => {
      if (coverageSummaryPath.includes(x)) {
        coverageType = x.toUpperCase();
        return;
      }
    });

  return {
    coverageType,
    ...obj,
  };
};

// Since we do not wish to post a path if it's a total,
// drop it when it's a total (totals go to a different index).
export const maybeDropCoveredFilePath = obj => {
  const { coveredFilePath } = obj;
  if (coveredFilePath === 'total') {
    delete obj.coveredFilePath;
  }
  return obj;
};

export const buildId = obj => {
  const { env } = process;
  if (env.BUILD_ID) obj.BUILD_ID = env.BUILD_ID;

  return {
    ...obj,
  };
};
