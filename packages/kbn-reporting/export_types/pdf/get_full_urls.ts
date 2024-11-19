/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  format as urlFormat,
  parse as urlParse,
  UrlWithParsedQuery,
  UrlWithStringQuery,
} from 'url';

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
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl);
    const jobUrl = getAbsoluteUrl({
      path: parsedRelative.pathname === null ? undefined : parsedRelative.pathname,
      hash: parsedRelative.hash === null ? undefined : parsedRelative.hash,
      search: parsedRelative.search === null ? undefined : parsedRelative.search,
    });

    // capture the route to the visualization
    const parsed: UrlWithParsedQuery = urlParse(jobUrl, true);
    if (parsed.hash == null) {
      throw new Error(
        'No valid hash in the URL! A hash is expected for the application to route to the intended visualization.'
      );
    }

    // allow the hash check to perform first
    if (!job.forceNow) {
      return jobUrl;
    }

    const visualizationRoute: UrlWithParsedQuery = urlParse(parsed.hash.replace(/^#/, ''), true);

    // combine the visualization route and forceNow parameter into a URL
    const transformedHash = urlFormat({
      pathname: visualizationRoute.pathname,
      query: {
        ...visualizationRoute.query,
        forceNow: job.forceNow,
      },
    });

    return urlFormat({
      ...parsed,
      hash: transformedHash,
    });
  });

  return urls;
}
