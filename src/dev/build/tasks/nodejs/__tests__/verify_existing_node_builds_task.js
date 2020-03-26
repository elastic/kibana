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

import sinon from 'sinon';
import expect from '@kbn/expect';

import * as NodeShasumsNS from '../node_shasums';
import * as NodeDownloadInfoNS from '../node_download_info';
import * as FsNS from '../../../lib/fs';
import { VerifyExistingNodeBuildsTask } from '../verify_existing_node_builds_task';

describe('src/dev/build/tasks/nodejs/verify_existing_node_builds_task', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  function setup({ nodeShasums } = {}) {
    const platforms = [
      { getName: () => 'foo', getNodeArch: () => 'foo:nodeArch' },
      { getName: () => 'bar', getNodeArch: () => 'bar:nodeArch' },
    ];

    const log = { success: sinon.stub() };
    const config = {
      getNodePlatforms: () => platforms,
      getNodeVersion: () => 'nodeVersion',
    };

    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo').callsFake((config, platform) => {
      return {
        url: `${platform.getName()}:url`,
        downloadPath: `${platform.getName()}:downloadPath`,
        downloadName: `${platform.getName()}:downloadName`,
      };
    });

    sandbox.stub(NodeShasumsNS, 'getNodeShasums').returns(
      nodeShasums || {
        'foo:downloadName': 'foo:sha256',
        'bar:downloadName': 'bar:sha256',
      }
    );

    sandbox.stub(FsNS, 'getFileHash').callsFake(path => {
      switch (path) {
        case 'foo:downloadPath':
          return 'foo:sha256';
        case 'bar:downloadPath':
          return 'bar:sha256';
      }
    });

    return { log, config, platforms };
  }

  it('downloads node builds for each platform', async () => {
    const { log, config, platforms } = setup();

    await VerifyExistingNodeBuildsTask.run(config, log);

    sinon.assert.calledOnce(NodeShasumsNS.getNodeShasums);

    sinon.assert.calledTwice(NodeDownloadInfoNS.getNodeDownloadInfo);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platforms[0]);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platforms[1]);

    sinon.assert.calledTwice(FsNS.getFileHash);
    sinon.assert.calledWithExactly(FsNS.getFileHash, 'foo:downloadPath', 'sha256');
    sinon.assert.calledWithExactly(FsNS.getFileHash, 'bar:downloadPath', 'sha256');
  });

  it('rejects if any download has an incorrect sha256', async () => {
    const { config, log } = setup({
      nodeShasums: {
        'foo:downloadName': 'foo:sha256',
        'bar:downloadName': 'bar:invalid',
      },
    });

    try {
      await VerifyExistingNodeBuildsTask.run(config, log);
      throw new Error('Expected VerifyExistingNodeBuildsTask to reject');
    } catch (error) {
      expect(error)
        .to.have.property('message')
        .be('Download at bar:downloadPath does not match expected checksum bar:sha256');
    }
  });
});
