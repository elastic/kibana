import fs from 'fs';
import { engines } from '../../../package.json';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
import expect from 'expect.js';

describe('All configs should use a single version of Node', () => {
  it('should compare .node-version and .nvmrc', async () => {
    const [nodeVersion, nvmrc] = await Promise.all([
      readFile('./.node-version', { encoding: 'utf-8' }),
      readFile('./.nvmrc', { encoding: 'utf-8' }),
    ]);

    expect(nodeVersion.trim()).to.be(nvmrc.trim());
  });

  it('should compare .node-version and engines.node from package.json', async () => {
    const nodeVersion = await readFile('./.node-version', {
      encoding: 'utf-8',
    });
    expect(nodeVersion.trim()).to.be(engines.node);
  });
});
