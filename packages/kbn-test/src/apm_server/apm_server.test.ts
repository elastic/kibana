/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
  createReplaceSerializer,
  createStripAnsiSerializer,
  kibanaPackageJson,
} from '@kbn/dev-utils';
import * as Rx from 'rxjs';

import { ApmServer } from './apm_server';

class MockApmServerProc {
  getState$() {
    return Rx.of({ type: 'ready' });
  }
}

expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));
expect.addSnapshotSerializer(createAnyInstanceSerializer(MockApmServerProc));
expect.addSnapshotSerializer(
  createReplaceSerializer(new RegExp(`^${kibanaPackageJson.branch}$`), '<pkg.branch>')
);
jest.mock('./archive_artifact');
jest.mock('./apm_server_installation');

const { ArchiveArtifact } = jest.requireMock('./archive_artifact');
ArchiveArtifact.fromStaging.mockImplementation(() => {
  return new ArchiveArtifact();
});
ArchiveArtifact.forBranch.mockImplementation(() => {
  return new ArchiveArtifact();
});

const { ApmServerInstallation } = jest.requireMock('./apm_server_installation');
ApmServerInstallation.prototype.run.mockImplementation(() => {
  return new MockApmServerProc();
});

const logCollector = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([logCollector]);

beforeEach(() => {
  logCollector.messages.length = 0;
  jest.clearAllMocks();
});

describe('#start()', () => {
  it('loads Artifact info based on branch in packageJson, ensures it is downloaded, installs the archive, and runs it', async () => {
    const apm = new ApmServer(log);
    await expect(
      apm.start({
        config: {
          port: 7777,
        },
      })
    ).resolves.toMatchInlineSnapshot(`<MockApmServerProc>`);

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " info ensuring updated artifact is downloaded",
        "   │ succ artifact downloaded to undefined",
        " info installing apm-server",
        "   │ succ apm-server installed to undefined",
        " info starting apm-server",
      ]
    `);

    expect(ArchiveArtifact.fromStaging).toHaveBeenCalledTimes(0);
    expect(ArchiveArtifact.forBranch).toHaveBeenCalledTimes(1);
    expect(ArchiveArtifact.forBranch.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "<pkg.branch>",
        ],
      ]
    `);

    expect(ArchiveArtifact.mock.instances).toHaveLength(1);
    const [artifact] = ArchiveArtifact.mock.instances;
    expect(artifact.ensureDownloaded.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [],
      ]
    `);

    expect(ApmServerInstallation.mock.instances).toHaveLength(1);
    const [node] = ApmServerInstallation.mock.instances;
    expect(node.extract.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [],
      ]
    `);
    expect(node.configureInstall.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "port": 7777,
          },
        ],
      ]
    `);
    expect(node.run.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [],
      ]
    `);
  });

  it('can customize the branch used', async () => {
    const apm = new ApmServer(log);
    await expect(
      apm.start({
        branch: 'some-feature-branch',
      })
    ).resolves.toMatchInlineSnapshot(`<MockApmServerProc>`);

    expect(ArchiveArtifact.fromStaging).toHaveBeenCalledTimes(0);
    expect(ArchiveArtifact.forBranch).toHaveBeenCalledTimes(1);
    expect(ArchiveArtifact.forBranch.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
          "some-feature-branch",
        ],
      ]
    `);
  });

  it('ignores branch and uses staging instances when configured', async () => {
    const apm = new ApmServer(log);
    await expect(
      apm.start({
        branch: 'some-feature-branch',
        staging: true,
      })
    ).resolves.toMatchInlineSnapshot(`<MockApmServerProc>`);

    expect(ArchiveArtifact.fromStaging).toHaveBeenCalledTimes(1);
    expect(ArchiveArtifact.fromStaging.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <ToolingLog>,
        ],
      ]
    `);
    expect(ArchiveArtifact.forBranch).toHaveBeenCalledTimes(0);
  });
});
