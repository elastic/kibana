/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = path.resolve(
  __dirname,
  '../../pipelines/quality_gates/publish_connector_production_manifest.sh'
);
const STANDARD_PIPELINE = path.resolve(
  __dirname,
  '../../../pipelines/quality-gates/pipeline.tests-production.yaml'
);
const EMERGENCY_PIPELINE = path.resolve(
  __dirname,
  '../../../pipelines/quality-gates/emergency/pipeline.tests-production.yaml'
);
const MANIFEST_PATH =
  '/repos/elastic/kibana/contents/src/platform/packages/shared/kbn-connector-specs/connector_execution_manifest.json';
const CANDIDATE_SHA = '1'.repeat(40);
const CURRENT_SHA = '2'.repeat(40);
const FINGERPRINT = 'a'.repeat(64);

const manifest = (deployedCommit) =>
  JSON.stringify({
    schemaVersion: '1',
    connectors: [
      {
        id: '.test',
        supportedFeatureIds: [],
        executionFingerprint: FINGERPRINT,
      },
    ],
    ...(deployedCommit ? { deployedCommit } : {}),
  });

const jsonResponse = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const runPublisher = ({ apiBase }) =>
  new Promise((resolve) => {
    const child = spawn('bash', [SCRIPT], {
      env: {
        ...process.env,
        GITHUB_API_BASE: apiBase,
        GITHUB_TOKEN: 'test-token',
        SERVICE_VERSION: CANDIDATE_SHA,
        BUILDKITE_BUILD_URL: 'https://buildkite.example/build/1',
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });

const withServer = async (handler, test) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await test(`http://127.0.0.1:${port}/repos/elastic/kibana`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('publish_connector_production_manifest.sh', () => {
  it('bootstraps the production branch and records the deployed commit', async () => {
    const requests = [];
    await withServer(
      async (request, response) => {
        let body = '';
        for await (const chunk of request) body += chunk;
        requests.push({ method: request.method, url: request.url, body });

        if (request.url === `${MANIFEST_PATH}?ref=${CANDIDATE_SHA}`) {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(manifest());
        } else if (
          request.method === 'GET' &&
          request.url === '/repos/elastic/kibana/git/ref/heads/connector-production-manifest'
        ) {
          jsonResponse(response, 404, { message: 'Not Found' });
        } else if (request.method === 'POST' && request.url === '/repos/elastic/kibana/git/refs') {
          jsonResponse(response, 201, { ref: 'refs/heads/connector-production-manifest' });
        } else if (
          request.method === 'GET' &&
          request.url === `${MANIFEST_PATH}?ref=connector-production-manifest`
        ) {
          jsonResponse(response, 200, {
            sha: 'manifest-file-sha',
            content: Buffer.from(manifest()).toString('base64'),
          });
        } else if (request.method === 'PUT' && request.url === MANIFEST_PATH) {
          jsonResponse(response, 200, { content: { sha: 'new-manifest-file-sha' } });
        } else {
          jsonResponse(response, 500, { message: `Unexpected request: ${request.url}` });
        }
      },
      async (apiBase) => {
        const result = await runPublisher({ apiBase });
        expect(result).toEqual(expect.objectContaining({ status: 0, stderr: '' }));
      }
    );

    const put = requests.find(({ method }) => method === 'PUT');
    const payload = JSON.parse(put.body);
    const published = JSON.parse(Buffer.from(payload.content, 'base64').toString());
    expect(payload.sha).toBe('manifest-file-sha');
    expect(published.deployedCommit).toBe(CANDIDATE_SHA);
    expect(published.buildUrl).toBe('https://buildkite.example/build/1');
  });

  it('rejects an older publication instead of overwriting the production baseline', async () => {
    let putCalled = false;
    await withServer(
      (request, response) => {
        if (request.url === `${MANIFEST_PATH}?ref=${CANDIDATE_SHA}`) {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(manifest());
        } else if (
          request.url === '/repos/elastic/kibana/git/ref/heads/connector-production-manifest'
        ) {
          jsonResponse(response, 200, { ref: 'refs/heads/connector-production-manifest' });
        } else if (request.url === `${MANIFEST_PATH}?ref=connector-production-manifest`) {
          jsonResponse(response, 200, {
            sha: 'manifest-file-sha',
            content: Buffer.from(manifest(CURRENT_SHA)).toString('base64'),
          });
        } else if (
          request.url === `/repos/elastic/kibana/compare/${CURRENT_SHA}...${CANDIDATE_SHA}`
        ) {
          jsonResponse(response, 200, { status: 'behind' });
        } else if (request.method === 'PUT') {
          putCalled = true;
          jsonResponse(response, 200, {});
        } else {
          jsonResponse(response, 500, { message: `Unexpected request: ${request.url}` });
        }
      },
      async (apiBase) => {
        const result = await runPublisher({ apiBase });
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/Refusing out-of-order manifest publication/);
      }
    );
    expect(putCalled).toBe(false);
  });

  it.each([STANDARD_PIPELINE, EMERGENCY_PIPELINE])(
    'runs only for the final production slice and serializes publication in %s',
    (pipelinePath) => {
      const pipeline = fs.readFileSync(pipelinePath, 'utf8');
      const stepStart = pipeline.indexOf("  - label: ':electric_plug: Publish connector");
      const nextStep = pipeline.indexOf('\n  - ', stepStart + 1);
      const publisherStep = pipeline.slice(stepStart, nextStep);

      expect(stepStart).toBeGreaterThan(-1);
      expect(publisherStep).toContain('build.env("ENVIRONMENT") == "production-noncanary"');
      expect(publisherStep).toContain('production-noncanary-ds-5');
      expect(publisherStep).toContain('publish_connector_production_manifest.sh');
      expect(publisherStep).toContain('concurrency: 1');
      expect(publisherStep).toContain('concurrency_group: connector-production-manifest');
    }
  );
});
