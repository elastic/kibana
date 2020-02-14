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

import moment from 'moment';

const XPACK = 'x-pack';

export const trimLeftFrom = (text, x) => x.replace(new RegExp(`(?:.*)(${text}.*$)`, 'gm'), '$1');

export const staticSite = urlBase => obj => {
  const { BUILD_ID, coveredFilePath } = obj;
  const ts = obj['@timestamp'];

  const trimmed = trimLeftFrom('kibana', coveredFilePath);

  const coveredFilePathAsStaticSiteUrl = `${urlBase}${BUILD_ID}/${ts}/${trimmed}`;

  obj.coveredFilePath = coveredFilePathAsStaticSiteUrl;

  return obj;
};
export const statsAndCoveredFilePath = (...xs) => {
  const [coveredFilePath] = xs[0][1];
  const [stats] = xs[0];
  return {
    coveredFilePath,
    ...stats,
  };
};
export const addPath = coveragePath => obj => ({
  coveragePath: trimLeftFrom('target', coveragePath),
  ...obj,
});

export const truncate = text => obj => {
  const { coveredFilePath } = obj;
  if (coveredFilePath.includes(text)) obj.coveredFilePath = trimLeftFrom(text, coveredFilePath);
  return obj;
};

export const timeStamp = obj => ({
  ...obj,
  '@timestamp': process.env.TIME_STAMP || moment.utc().format(),
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
  const { coveragePath } = obj;

  let coverageType = 'OTHER';

  if (coveragePath.includes(`mocha`)) {
    coverageType = 'MOCHA';
  }

  if (coveragePath.includes(`jest`)) {
    coverageType = 'JEST';
  }

  if (coveragePath.includes('functional')) {
    coverageType = 'FUNCTIONAL';
  }

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
