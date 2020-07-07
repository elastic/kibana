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

import * as Either from './either';
import { fromNullable } from './maybe';
import { always, id, noop } from './utils';

const maybeTotal = (x) => (x === 'total' ? Either.left(x) : Either.right(x));

const trimLeftFrom = (text, x) => x.substr(x.indexOf(text));

export const statsAndstaticSiteUrl = (...xs) => {
  const [staticSiteUrl] = xs[0][1];
  const [stats] = xs[0];
  return {
    staticSiteUrl,
    ...stats,
  };
};

export const addJsonSummaryPath = (jsonSummaryPath) => (obj) => ({ jsonSummaryPath, ...obj });

export const truncate = (text) => (obj) => {
  const { staticSiteUrl } = obj;
  if (staticSiteUrl.includes(text)) obj.staticSiteUrl = trimLeftFrom(text, staticSiteUrl);
  return obj;
};

export const addTimeStamp = (ts) => (obj) => ({
  ...obj,
  '@timestamp': ts,
});

const setTotal = (x) => (obj) => (obj.isTotal = x);
const mutateTrue = setTotal(true);
const mutateFalse = setTotal(false);

const root = (urlBase) => (ts) => (testRunnerType) =>
  `${urlBase}/${ts}/${testRunnerType.toLowerCase()}-combined`;

const prokForTotalsIndex = (mutateTrue) => (urlRoot) => (obj) =>
  Either.right(obj)
    .map(mutateTrue)
    .map(always(`${urlRoot}/index.html`))
    .fold(noop, id);

const prokForCoverageIndex = (root) => (mutateFalse) => (urlRoot) => (obj) => (siteUrl) =>
  Either.right(siteUrl)
    .map((x) => {
      mutateFalse(obj);
      return x;
    })
    .map((x) => x.replace(root, ''))
    .map((x) => `${urlRoot}${x}.html`)
    .fold(noop, id);

export const staticSite = (urlBase) => (obj) => {
  const { staticSiteUrl, testRunnerType, COVERAGE_INGESTION_KIBANA_ROOT } = obj;
  const ts = obj['@timestamp'];
  const urlRoot = root(urlBase)(ts)(testRunnerType);
  const prokTotal = prokForTotalsIndex(mutateTrue)(urlRoot);
  const prokCoverage = prokForCoverageIndex(COVERAGE_INGESTION_KIBANA_ROOT)(mutateFalse)(urlRoot)(
    obj
  );
  const prokForBoth = always(maybeTotal(staticSiteUrl).fold(always(prokTotal(obj)), prokCoverage));

  return { ...obj, staticSiteUrl: prokForBoth() };
};

export const coveredFilePath = (obj) => {
  const { staticSiteUrl, COVERAGE_INGESTION_KIBANA_ROOT } = obj;

  const withoutCoveredFilePath = always(obj);
  const leadingSlashRe = /^\//;
  const maybeDropLeadingSlash = (x) => (leadingSlashRe.test(x) ? Either.right(x) : Either.left(x));
  const dropLeadingSlash = (x) => x.replace(leadingSlashRe, '');
  const dropRoot = (root) => (x) =>
    maybeDropLeadingSlash(x.replace(root, '')).fold(id, dropLeadingSlash);
  return maybeTotal(staticSiteUrl)
    .map(dropRoot(COVERAGE_INGESTION_KIBANA_ROOT))
    .fold(withoutCoveredFilePath, (coveredFilePath) => ({ ...obj, coveredFilePath }));
};

export const ciRunUrl = (obj) =>
  Either.fromNullable(process.env.CI_RUN_URL).fold(always(obj), (ciRunUrl) => ({
    ...obj,
    ciRunUrl,
  }));

const size = 50;
const truncateMsg = (msg) => {
  const res = msg.length > size ? `${msg.slice(0, 50)}...` : msg;
  return res;
};
const comparePrefix = () => 'https://github.com/elastic/kibana/compare';
export const prokPrevious = (comparePrefixF) => (currentSha) => {
  return Either.fromNullable(process.env.FETCHED_PREVIOUS).fold(
    noop,
    (previousSha) => `${comparePrefixF()}/${previousSha}...${currentSha}`
  );
};
export const itemizeVcs = (vcsInfo) => (obj) => {
  const [branch, sha, author, commitMsg] = vcsInfo;

  const vcs = {
    branch,
    sha,
    author,
    vcsUrl: `https://github.com/elastic/kibana/commit/${sha}`,
  };

  const mutateVcs = (x) => (vcs.commitMsg = truncateMsg(x));
  fromNullable(commitMsg).map(mutateVcs);

  const vcsCompareUrl = process.env.FETCHED_PREVIOUS
    ? `${comparePrefix()}/${process.env.FETCHED_PREVIOUS}...${sha}`
    : 'PREVIOUS SHA NOT PROVIDED';

  // const withoutPreviousL = always({ ...obj, vcs });
  const withPreviousR = () => ({
    ...obj,
    vcs: {
      ...vcs,
      vcsCompareUrl,
    },
  });
  return withPreviousR();
};
export const testRunner = (obj) => {
  const { jsonSummaryPath } = obj;

  let testRunnerType = 'other';

  const upperTestRunnerType = (x) => {
    if (jsonSummaryPath.includes(x)) {
      testRunnerType = x.toUpperCase();
      return;
    }
  };

  ['mocha', 'jest', 'functional'].forEach(upperTestRunnerType);

  return {
    testRunnerType,
    ...obj,
  };
};

export const buildId = (obj) => {
  const { env } = process;
  if (env.BUILD_ID) obj.BUILD_ID = env.BUILD_ID;

  return {
    ...obj,
  };
};
