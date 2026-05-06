/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';

import type { TaskRunMetrics, TaskRunResult } from '@kbn/reporting-common/types';
import { PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

import { REPORTING_REMOTE_EXECUTE_METADATA_SEPARATOR } from './protocol';

interface ReportingRemoteExecuteHttpRequest {
  readonly jobId: string;
  readonly jobtype: string;
  readonly executionPayload: unknown;
  readonly forwardHeaders: Record<string, string>;
}

/*
 * Minimal valid PDF / PNG payloads for integration testing only.
 * Replace with real Chromium rendering that honors forwardHeaders + resolvedScreenshots.
 */
const MINIMAL_TEST_PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    'trailer<</Size 4/Root 1 0 R>>',
    'startxref',
    '190',
    '%%EOF',
    '',
  ].join('\n'),
  'utf8'
);

const MINIMAL_TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function assertAuthorized(req: http.IncomingMessage): void {
  const expectedKey = process.env.REPORTING_REMOTE_EXECUTOR_API_KEY;
  if (!expectedKey) {
    throw Object.assign(new Error('REPORTING_REMOTE_EXECUTOR_API_KEY is not set'), {
      statusCode: 500,
    });
  }

  const authHeader = req.headers.authorization ?? '';
  const authorized =
    authHeader === `ApiKey ${expectedKey}` || authHeader === `Bearer ${expectedKey}`;

  if (!authorized) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}

async function readJsonBody(req: http.IncomingMessage): Promise<ReportingRemoteExecuteHttpRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw) as ReportingRemoteExecuteHttpRequest;
  } catch (err) {
    throw Object.assign(new Error(`Invalid JSON body: ${err}`), { statusCode: 400 });
  }
}

function stubExport(jobtype: string): { bytes: Buffer; metadata: TaskRunResult } {
  let metrics: TaskRunMetrics;

  if (jobtype === PDF_JOB_TYPE_V2) {
    metrics = {
      pdf: {
        pages: 1,
      },
    };
    return {
      bytes: MINIMAL_TEST_PDF,
      metadata: {
        content_type: 'application/pdf',
        metrics,
      },
    };
  }

  if (jobtype === PNG_JOB_TYPE_V2) {
    metrics = {
      png: {},
    };
    return {
      bytes: MINIMAL_TEST_PNG,
      metadata: {
        content_type: 'image/png',
        metrics,
      },
    };
  }

  throw Object.assign(
    new Error(`Unsupported job type "${jobtype}" for the reporting remote executor`),
    { statusCode: 400 }
  );
}

export interface ReportingRemoteExecutorListenOpts {
  readonly port: number;
  readonly host?: string;
}

export async function startReportingRemoteExecutorServer(
  opts: ReportingRemoteExecutorListenOpts
): Promise<http.Server> {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }

      assertAuthorized(req);
      const body = await readJsonBody(req);

      if (process.env.REPORTING_REMOTE_EXECUTOR_DEBUG === 'true') {
        process.stderr.write(
          `${JSON.stringify({
            jobId: body.jobId,
            jobtype: body.jobtype,
            forwardHeaderKeys: Object.keys(body.forwardHeaders ?? {}),
          })}\n`
        );
      }

      const { bytes, metadata } = stubExport(body.jobtype);
      const prefix = Buffer.from(
        `${JSON.stringify(metadata)}${REPORTING_REMOTE_EXECUTE_METADATA_SEPARATOR}`,
        'utf8'
      );

      res.statusCode = 200;
      res.setHeader('content-type', 'application/octet-stream');
      res.setHeader('x-elastic-reporting-job-id', body.jobId);
      res.write(prefix);
      res.end(bytes);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.statusCode = statusCode;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end((err as Error).message);
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(opts.port, opts.host ?? '127.0.0.1', resolve);
  });

  return server;
}
