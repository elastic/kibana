import expect from 'expect.js';

import { getNodeShasums } from '../node_shasums';

describe('src/dev/build/tasks/nodejs/node_shasums', () => {
  it('resolves to an object with shasums for node downloads for version', async () => {
    const shasums = await getNodeShasums('8.9.4');
    expect(shasums).to.have.property('node-v8.9.4.tar.gz');
  });
});
