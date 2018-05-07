import sinon from 'sinon';
import { resolve } from 'path';

import * as NodeDownloadInfoNS from '../node_download_info';
import * as FsNS from '../../../lib/fs';
import { ExtractNodeBuildsTask } from '../extract_node_builds_task';

describe('src/dev/build/tasks/node_extract_node_builds_task', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    sandbox.restore();
  });


  it('copies downloadPath to extractDir/node.exe for windows platform', async () => {
    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo').returns({
      downloadPath: 'downloadPath',
      extractDir: 'extractDir',
    });

    sandbox.stub(FsNS, 'copy');
    sandbox.stub(FsNS, 'untar');

    const platform = {
      isWindows: () => true
    };

    const config = {
      getPlatforms: () => [platform]
    };

    await ExtractNodeBuildsTask.run(config);

    sinon.assert.calledOnce(NodeDownloadInfoNS.getNodeDownloadInfo);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platform);

    sinon.assert.calledOnce(FsNS.copy);
    sinon.assert.calledWithExactly(FsNS.copy, 'downloadPath', resolve('extractDir/node.exe'));

    sinon.assert.notCalled(FsNS.untar);
  });

  it('untars downloadPath to extractDir, stripping the top level of the archive, for non-windows platforms', async () => {
    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo').returns({
      downloadPath: 'downloadPath',
      extractDir: 'extractDir',
    });

    sandbox.stub(FsNS, 'copy');
    sandbox.stub(FsNS, 'untar');

    const platform = {
      isWindows: () => false
    };

    const config = {
      getPlatforms: () => [platform]
    };

    await ExtractNodeBuildsTask.run(config);

    sinon.assert.calledOnce(NodeDownloadInfoNS.getNodeDownloadInfo);
    sinon.assert.calledWithExactly(NodeDownloadInfoNS.getNodeDownloadInfo, config, platform);

    sinon.assert.notCalled(FsNS.copy);

    sinon.assert.calledOnce(FsNS.untar);
    sinon.assert.calledWithExactly(FsNS.untar, 'downloadPath', 'extractDir', {
      strip: 1
    });
  });
});
