import sinon from 'sinon';
import expect from 'expect.js';

import * as NodeShasumsNS from '../node_shasums';
import * as NodeDownloadInfoNS from '../node_download_info';
import * as DownloadNS from '../download';
import { DownloadNodeBuildsTask } from '../download_node_builds_task';

describe('src/dev/build/tasks/nodejs/download_node_builds_task', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    sandbox.restore();
  });

  function setup({ failOnUrl } = {}) {
    const platforms = [
      { getName: () => 'foo' },
      { getName: () => 'bar' },
    ];

    const log = {};
    const config = {
      getPlatforms: () => platforms,
      getNodeVersion: () => 'nodeVersion',
    };

    sandbox.stub(NodeDownloadInfoNS, 'getNodeDownloadInfo', function (config, platform) {
      return {
        url: `${platform.getName()}:url`,
        downloadPath: `${platform.getName()}:downloadPath`,
        downloadName: `${platform.getName()}:downloadName`,
      };
    });

    sandbox.stub(NodeShasumsNS, 'getNodeShasums').returns({
      'foo:downloadName': 'foo:sha256',
      'bar:downloadName': 'bar:sha256',
    });

    sandbox.stub(DownloadNS, 'download', function ({ url }) {
      if (url === failOnUrl) {
        throw new Error('Download failed for reasons');
      }
    });

    return { log, config };
  }

  it('downloads node builds for each platform', async () => {
    const { log, config } = setup();

    await DownloadNodeBuildsTask.run(config, log);

    sinon.assert.calledTwice(DownloadNS.download);
    sinon.assert.calledWithExactly(DownloadNS.download, {
      log,
      url: 'foo:url',
      sha256: 'foo:sha256',
      destination: 'foo:downloadPath',
      retries: 3
    });
    sinon.assert.calledWithExactly(DownloadNS.download, {
      log,
      url: 'bar:url',
      sha256: 'bar:sha256',
      destination: 'bar:downloadPath',
      retries: 3
    });
  });

  it('rejects if any download fails', async () => {
    const { config, log } = setup({ failOnUrl: 'foo:url' });

    try {
      await DownloadNodeBuildsTask.run(config, log);
      throw new Error('Expected DownloadNodeBuildsTask to reject');
    } catch (error) {
      expect(error).to.have.property('message').be('Download failed for reasons');
    }
  });
});
