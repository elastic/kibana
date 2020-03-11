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
import { always, id, noop } from './utils';

const maybeTotal = x =>
  x === 'total' ? left(x) : right(x);

export const trimLeftFrom = (text, x) => x.replace(new RegExp(`(?:.*)(${text}.*$)`, 'gm'), '$1');

export const statsAndstaticSiteUrl = (...xs) => {
  const [staticSiteUrl] = xs[0][1];
  const [stats] = xs[0];
  return {
    staticSiteUrl,
    ...stats,
  };
};

export const addJsonSummaryPath = jsonSummaryPath => obj => ({
  jsonSummaryPath: trimLeftFrom('target', jsonSummaryPath),
  ...obj,
});

export const truncate = text => obj => {
  const { staticSiteUrl } = obj;
  if (staticSiteUrl.includes(text)) obj.staticSiteUrl = trimLeftFrom(text, staticSiteUrl);
  return obj;
};

export const addTimeStamp = ts => obj => ({
  ...obj,
  '@timestamp': ts,
});

const captureAfterJobNameAndRootFolder = /.*elastic\+kibana\+code-coverage\/kibana(.*$)/;
const afterJobNameAndRootFolder = x => captureAfterJobNameAndRootFolder.exec(x)[1];
const fixFront = x => afterJobNameAndRootFolder(x);
const setTotal = x => obj =>
  obj['isTotal'] = x;
const mutateTrue = setTotal(true);
const mutateFalse = setTotal(false);

const prokForTotalsIndex = urlBase => ts => obj =>
  right(obj)
    .map(mutateTrue)
    .map(always(`${urlBase}/${ts}/index.html`))
    .fold(noop, id);

const prokForCoverageIndex = urlBase => ts => testRunnerType => obj => siteUrl =>
  right(siteUrl)
    .map(x => {
      mutateFalse(obj);
      return x;
    })
    .map(fixFront)
    .map(x => `${urlBase}/${ts}/${testRunnerType.toLowerCase()}-combined${x}.html`)
    .fold(noop, id);

export const staticSite = urlBase => obj => {
  const { staticSiteUrl, testRunnerType } = obj;
  const ts = obj['@timestamp'];
  const prokTotal = prokForTotalsIndex(urlBase)(ts);
  const prokCoverage = prokForCoverageIndex(urlBase)(ts)(testRunnerType)(obj);

  delete obj['staticSiteUrl'];
  obj['staticSiteUrl'] = maybeTotal(staticSiteUrl).fold(always(prokTotal(obj)), prokCoverage);

  return obj;
};

export const coveredFilePath = obj => {
  const { staticSiteUrl } = obj;

  const withoutCoveredFilePath = always(obj);
  const dropFront = x => trimLeftFrom('/kibana/', x).replace(/(^\/kibana\/)/, '');

  return maybeTotal(staticSiteUrl)
    .map(dropFront)
    .fold(withoutCoveredFilePath, coveredFilePath => ({ ...obj, coveredFilePath }));
};

export const ciRunUrl = obj => {
  const ciRunUrl = process.env.CI_RUN_URL || 'CI RUN URL NOT PROVIDED';

  return {
    ...obj,
    ciRunUrl,
  };
};

export const testRunner = obj => {
  const { jsonSummaryPath } = obj;

  let testRunnerType = 'other';

  const upperTestRunnerType = x => {
    if (jsonSummaryPath.includes(x)) {
      testRunnerType = x.toUpperCase();
      return;
    }
  };

  ['mocha', 'jest', 'functional']
    .forEach(upperTestRunnerType);

  return {
    testRunnerType,
    ...obj,
  };
};

export const buildId = obj => {
  const { env } = process;
  if (env.BUILD_ID) obj.BUILD_ID = env.BUILD_ID;

  return {
    ...obj,
  };
};
