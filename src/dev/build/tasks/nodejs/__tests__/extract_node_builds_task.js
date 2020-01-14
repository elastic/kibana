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
import { resolve } from 'path';
import * as NodeDownloadInfoNS from '../node_download_info';
import * as FsNS from '../../../lib/fs';
import { ExtractNodeBuildsTask } from '../extract_node_builds_task';

describe('src/dev/build/tasks/node_extract_node_builds_task', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it('copies downloadPath to extractDir/node.exe for windows platform', async () => {
    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo').returns({
      downloadPath: 'downloadPath',
      extractDir: 'extractDir',
    });

    sandbox.stub(ExtractNodeBuildsTask, 'copyWindows');
    sandbox.stub(FsNS, 'untar');

    const platform = {
      isWindows: () => true,
    };

    const config = {
      getNodePlatforms: () => [platform],
    };

    await ExtractNodeBuildsTask.run(config);

    sinon.assert.calledOnce(NodeDownloadInfoNS.getNodeDownloadInfo);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platform);

    sinon.assert.calledOnce(ExtractNodeBuildsTask.copyWindows);
    sinon.assert.calledWithExactly(
      ExtractNodeBuildsTask.copyWindows,
      'downloadPath',
      resolve('extractDir/node.exe')
    );

    sinon.assert.notCalled(FsNS.untar);
  });

  it('untars downloadPath to extractDir, stripping the top level of the archive, for non-windows platforms', async () => {
    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo').returns({
      downloadPath: 'downloadPath',
      extractDir: 'extractDir',
    });

    sandbox.stub(ExtractNodeBuildsTask, 'copyWindows');
    sandbox.stub(FsNS, 'untar');

    const platform = {
      isWindows: () => false,
    };

    const config = {
      getNodePlatforms: () => [platform],
    };

    await ExtractNodeBuildsTask.run(config);

    sinon.assert.calledOnce(NodeDownloadInfoNS.getNodeDownloadInfo);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platform);

    sinon.assert.notCalled(ExtractNodeBuildsTask.copyWindows);

    sinon.assert.calledOnce(FsNS.untar);
    sinon.assert.calledWithExactly(FsNS.untar, 'downloadPath', 'extractDir', {
      strip: 1,
    });
  });
});
