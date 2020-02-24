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
import { always } from './utils';
import { XPACK, STATIC_SITE_URL_PROP_NAME } from './constants';

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

export const addCoverageSummaryPath = coverageSummaryPath => obj => ({
  coverageSummaryPath: trimLeftFrom('target', coverageSummaryPath),
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

export const distro = obj => {
  const { staticSiteUrl } = obj;
  let distro;
  if (process.env.DISTRO) {
    distro = process.env.DISTRO;
  } else {
    distro = staticSiteUrl.includes(XPACK) ? XPACK : 'OSS';
  }

  return {
    ...obj,
    distro,
  };
};

const dropFront = staticSiteUrl => {
  const result = trimLeftFrom('kibana', staticSiteUrl);
  const trimmedAgain = result.replace(/kibana/, '');
  return trimmedAgain;
}
const buildFinalUrl = (urlBase, BUILD_ID, ts, testRunnerType) => trimmed =>
  `${urlBase}/${BUILD_ID}/${ts}/${testRunnerType.toLowerCase()}-combined${trimmed}`;
const assignUrl = obj => name => value => {
  obj[name] = value;
  return obj;
};
export const staticSite = urlBase => obj => {
  const { BUILD_ID, staticSiteUrl, testRunnerType } = obj;
  const ts = obj['@timestamp'];

  const buildFinalStaticSiteUrl = buildFinalUrl(urlBase, BUILD_ID, ts, testRunnerType);
  const assignObj = assignUrl(obj);
  const assignstaticSiteUrl = assignObj(STATIC_SITE_URL_PROP_NAME);

  return maybeTotal(staticSiteUrl)
    .map(dropFront)
    .map(buildFinalStaticSiteUrl)
    .fold(always(assignstaticSiteUrl(undefined)), assignstaticSiteUrl);

};

export const testRunner = obj => {
  const { coverageSummaryPath } = obj;

  let testRunnerType = 'other';

  const upperTestRunnerType = x => {
    if (coverageSummaryPath.includes(x)) {
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
