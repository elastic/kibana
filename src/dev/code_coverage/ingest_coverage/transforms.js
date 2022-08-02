/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from './either';
import * as Maybe from './maybe';
import { always, id, noop, pink, pipe, ccMark } from './utils';
import execa from 'execa';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '../../../..');

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

const prokForTotalsIndex = (mutateTrue) => (urlRoot) => (obj) => {
  pipe(mutateTrue, always(`${urlRoot}/index.html`))(obj);
};

const prokForCoverageIndex = (root) => (mutateFalse) => (urlRoot) => (obj) => (siteUrl) =>
  pipe(
    (x) => {
      mutateFalse(obj);
      return x;
    },
    (x) => x.replace(root, ''),
    (x) => `${urlRoot}${x}.html`
  )(siteUrl);

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

const leadingSlashRe = /^\//;
export const maybeDropLeadingSlash = (x) =>
  leadingSlashRe.test(x) ? Either.right(x) : Either.left(x);
export const dropLeadingSlash = (x) => x.replace(leadingSlashRe, '');
export const stripLeading = (x) => maybeDropLeadingSlash(x).fold(id, dropLeadingSlash);

export const coveredFilePath = (obj) => {
  const { staticSiteUrl, COVERAGE_INGESTION_KIBANA_ROOT } = obj;

  const withoutCoveredFilePath = always(obj);
  const dropRoot = (root) => (x) => stripLeading(x.replace(root, ''));
  return maybeTotal(staticSiteUrl)
    .map(dropRoot(COVERAGE_INGESTION_KIBANA_ROOT))
    .fold(withoutCoveredFilePath, (coveredFilePath) => ({ ...obj, coveredFilePath }));
};

const findTeam = (x) => x.match(/.+\s{1,3}(.+)$/, 'gm');
export const pluckIndex = (idx) => (xs) => xs[idx];
const pluckTeam = pluckIndex(1);

export const teamAssignment = (teamAssignmentsPath) => (log) => async (obj) => {
  const { coveredFilePath } = obj;
  const isTotal = Either.fromNullable(obj.isTotal);

  return isTotal.isRight() ? obj : await assignTeam(teamAssignmentsPath, coveredFilePath, log, obj);
};
export const last = (x) => {
  const xs = x.split('\n');
  const len = xs.length;

  return len === 1 ? xs[0] : xs[len - 1];
};
async function assignTeam(teamAssignmentsPath, coveredFilePath, log, obj) {
  const params = [coveredFilePath, teamAssignmentsPath];

  let grepResponse;

  try {
    const { stdout } = await execa('grep', params, { cwd: ROOT_DIR });
    grepResponse = stdout;
  } catch (e) {
    Either.fromNullable(process.env.LOG_NOT_FOUND).fold(id, () =>
      log.error(`\n${ccMark} Unknown Team for path: \n\t\t${pink(coveredFilePath)}\n`)
    );
  }
  return Either.fromNullable(grepResponse)
    .map(pipe(last, findTeam, pluckTeam))
    .fold(
      () => ({ team: 'unknown', ...obj }),
      (team) => ({ team, ...obj })
    );
}

export const ciRunUrl = (obj) =>
  Either.fromNullable(process.env.CI_RUN_URL).fold(always(obj), (ciRunUrl) => ({
    ...obj,
    ciRunUrl,
  }));

const size = 50;
const truncateMsg = (msg) => (msg.length > size ? `${msg.slice(0, 50)}...` : msg);
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
  Maybe.fromNullable(commitMsg).map(mutateVcs);

  const vcsCompareUrl = process.env.FETCHED_PREVIOUS
    ? `${comparePrefix()}/${process.env.FETCHED_PREVIOUS}...${sha}`
    : 'PREVIOUS SHA NOT PROVIDED';

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

  ['jest', 'functional'].forEach(upperTestRunnerType);

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
