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
const maybeTotal = coveredFilePath => coveredFilePath === 'total' ?
  left(coveredFilePath) : right(coveredFilePath);

export const trimLeftFrom = (text, x) => x.replace(new RegExp(`(?:.*)(${text}.*$)`, 'gm'), '$1');

const dropFront = coveredFilePath => trimLeftFrom('kibana', coveredFilePath);
const buildFinalUrl = (urlBase, BUILD_ID, ts) => trimmed => {
  const result = `${urlBase}/${BUILD_ID}/${ts}/${trimmed}`;
  return result;
}
const assignAndReturn = obj => x => {
  obj.coveredFilePath = x;
  return obj;
};
export const staticSite = urlBase => obj => {
  const { BUILD_ID, coveredFilePath, coverageType } = obj;
  console.log(`\n### coverageType: \n\t${coverageType}`);
  const ts = obj['@timestamp'];

  const buildTrimmed = buildFinalUrl(urlBase, BUILD_ID, ts);
  const assignObj = assignAndReturn(obj);

  return maybeTotal(coveredFilePath)
    .map(dropFront)
    .map(buildTrimmed)
    .fold(assignObj, assignObj);

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
  const { coverageSummaryPath, coveredFilePath } = obj;
  console.log(`\n### coveredFilePath: \n\t${coveredFilePath}`);

  let coverageType = 'other';

  const upperCoverageType = x => {
    if (coverageSummaryPath.includes(x)) {
      coverageType = x.toUpperCase();
      return;
    }
  };

  ['mocha', 'jest', 'functional']
    .forEach(upperCoverageType);

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
