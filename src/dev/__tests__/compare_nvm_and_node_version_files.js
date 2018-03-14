import fs from 'fs';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
import expect from 'expect.js';

function removeLineBreak(str) {
  return str.replace('\n', '');
}

describe('compare .nvmrc and .node-version files', () => {
  it('should match', () => {
    return Promise.all([
      readFile('./.nvmrc', { encoding: 'utf-8' }),
      readFile('./.node-version', { encoding: 'utf-8' }),
    ])
      .then(([nvmrc, nodeVersion]) => {
        expect(removeLineBreak(nvmrc)).to.be(removeLineBreak(nodeVersion));
      })
      .catch(e => {
        expect().fail(e);
      });
  });
});
