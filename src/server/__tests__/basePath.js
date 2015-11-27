import { resolve } from 'path';
import { fromNode as fn } from 'bluebird';
import expect from 'expect.js';

import KbnServer from '../KbnServer';

const src = resolve.bind(__dirname, '../../');
const basePath = '/kibana';

describe('Server basePath config', function () {
  this.slow(10000);
  this.timeout(60000);

  let kbnServer;
  before(async function () {
    kbnServer = new KbnServer({
      server: { autoListen: false, basePath },
      plugins: { scanDirs: [src('plugins')] },
      logging: { quiet: true },
      optimize: { enabled: false },
    });
    await kbnServer.ready();
    return kbnServer;
  });

  after(async function () {
    await kbnServer.close();
  });

  it('appends the basePath to root redirect', async function () {
    const response = await kbnServer.inject({
      url: '/',
      method: 'GET'
    });

    expect(response.payload).to.match(/defaultRoute = '\/kibana\/app\/kibana'/);
  });
});
