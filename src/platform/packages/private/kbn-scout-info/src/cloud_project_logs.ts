/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutElasticCloudTarget } from './reporting';

const OVERVIEW_QA_KIBANA_URL = 'https://overview.qa.cld.elstc.co';
const MINUTE_MS = 60_000;

// Both go into ES|QL string literals, so anything else is rejected rather than escaped.
const PROJECT_ID_RE = /^[a-z0-9]+$/;
const REGION_RE = /^[a-z0-9-]+$/;

export interface CloudProjectLogs {
  readonly projectId: string;
  readonly region: string;
  /** Start and end of the time range, as ISO timestamps. */
  readonly from: string;
  readonly to: string;
  /** Discover on the overview QA cluster, with the project's logs in one table. */
  readonly url: string;
}

const risonString = (value: string): string => `'${value.replace(/!/g, '!!').replace(/'/g, "!'")}'`;

// Also encodes the rison delimiters, which would otherwise end a Markdown link early.
const encodeStrict = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

// Autoscaler events, Elasticsearch errors and failed requests (rest.suppressed), Kibana errors and
// pod starts and readiness (root and status loggers), and proxy responses with status 429 and
// above. INITIALIZING responses are left out: they flood the table while the project is created.
const timelineEsql = (region: string, projectId: string): string => {
  const cluster = `logging-${region}`;
  return [
    `FROM ${cluster}:logs-elastic-pod-autoscaler.log-default, ${cluster}:logs-elasticsearch.server-default, ${cluster}:logs-kibana.log-default, ${cluster}:logs-proxy.log-default`,
    `| WHERE serverless.project.id == "${projectId}"`,
    '  AND (event.dataset == "elastic-pod-autoscaler.log"',
    '    OR (event.dataset == "elasticsearch.server" AND (log.level == "ERROR" OR log.logger == "rest.suppressed"))',
    '    OR (event.dataset == "kibana.log" AND (log.level == "ERROR" OR log.logger IN ("root", "status")))',
    '    OR (event.dataset == "proxy.log" AND status_code >= 429 AND COALESCE(status_reason, "") != "INITIALIZING"))',
    '| EVAL source = CASE(event.dataset == "proxy.log", "proxy", event.dataset == "kibana.log", "kibana", event.dataset == "elasticsearch.server", "elasticsearch", "autoscaler")',
    '| EVAL pod = COALESCE(handling_pod, ElasticPodAutoscaler.name, kubernetes.pod.name)',
    '| EVAL event = CASE(event.dataset == "proxy.log", CONCAT(TO_STRING(status_code), " ", status_reason, " ", request_method, " ", request_path), error.message IS NOT NULL, CONCAT(error.message, " | ", message), message)',
    '| KEEP @timestamp, source, pod, event',
    '| SORT @timestamp',
    // An explicit limit keeps ES|QL from warning that it added its default one.
    '| LIMIT 1000',
  ].join('\n');
};

/**
 * A link to the logs of the Elastic Cloud QA project a test ran against, from 5 minutes before it
 * started to 2 minutes after it ended. Undefined for other targets, or without a valid start time.
 */
export const getCloudProjectLogs = ({
  target,
  startTime,
  duration = 0,
}: {
  target?: ScoutElasticCloudTarget;
  /** When the test started, as an ISO timestamp. */
  startTime?: string;
  /** How long the test ran, in milliseconds. */
  duration?: number;
}): CloudProjectLogs | undefined => {
  const projectId = target?.project?.id;
  const region = target?.region;
  if (
    target?.environment !== 'qa' ||
    !projectId ||
    !region ||
    !PROJECT_ID_RE.test(projectId) ||
    !REGION_RE.test(region)
  ) {
    return undefined;
  }

  const start = startTime ? Date.parse(startTime) : NaN;
  if (!Number.isFinite(start)) {
    return undefined;
  }
  const end = start + (Number.isFinite(duration) ? Math.max(duration, 0) : 0);
  const from = new Date(start - 5 * MINUTE_MS).toISOString();
  const to = new Date(end + 2 * MINUTE_MS).toISOString();
  const globalState = `(time:(from:${risonString(from)},to:${risonString(to)}))`;
  const appState = `(dataSource:(type:esql),query:(esql:${risonString(
    timelineEsql(region, projectId)
  )}))`;

  return {
    projectId,
    region,
    from,
    to,
    url: `${OVERVIEW_QA_KIBANA_URL}/app/discover#/?_g=${encodeStrict(
      globalState
    )}&_a=${encodeStrict(appState)}`,
  };
};
