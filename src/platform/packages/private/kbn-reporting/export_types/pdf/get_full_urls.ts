/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { TaskPayloadPDF } from '@kbn/reporting-export-types-pdf-common';
import type { ReportingConfigType } from '@kbn/reporting-server';

import { getAbsoluteUrlFactory } from './get_absolute_url';
import { validateUrls } from './validate_urls';

export function getFullUrls(
  serverInfo: ReportingServerInfo,
  config: ReportingConfigType,
  job: TaskPayloadPDF
) {
  const {
    kibanaServer: { protocol, hostname, port },
  } = config;
  const getAbsoluteUrl = getAbsoluteUrlFactory({
    basePath: serverInfo.basePath,
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
  });

  let relativeUrls: string[] = [];

  try {
    relativeUrls = job.objects.map((obj) => obj.relativeUrl);
  } catch (error) {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\``
    );
  }
  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative = new URL(relativeUrl, 'http://localhost');
    const jobUrl = getAbsoluteUrl({
      path: parsedRelative.pathname || undefined,
      hash: parsedRelative.hash || undefined,
      search: parsedRelative.search || undefined,
    });

    // capture the route to the visualization
    const parsed = new URL(jobUrl);
    if (!parsed.hash) {
      throw new Error(
        'No valid hash in the URL! A hash is expected for the application to route to the intended visualization.'
      );
    }

    // allow the hash check to perform first
    if (!job.forceNow) {
      return jobUrl;
    }

    const visualizationRoute = new URL(parsed.hash.replace(/^#/, ''), 'http://localhost');
    visualizationRoute.searchParams.set('forceNow', job.forceNow);
    parsed.hash = `${visualizationRoute.pathname}${visualizationRoute.search}`;

    return parsed.toString();
  });

  return urls;
}
