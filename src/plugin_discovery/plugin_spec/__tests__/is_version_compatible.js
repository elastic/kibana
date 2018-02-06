import expect from 'expect.js';

import { isVersionCompatible } from '../is_version_compatible';

describe('plugin discovery/plugin spec', () => {
  describe('isVersionCompatible()', () => {
    const tests = [
      ['kibana', '6.0.0', true],
      ['kibana', '6.0.0-rc1', true],
      ['6.0.0-rc1', '6.0.0', true],
      ['6.0.0', '6.0.0-rc1', true],
      ['6.0.0-rc2', '6.0.0-rc1', true],
      ['6.0.0-rc2', '6.0.0-rc3', true],
      ['foo', 'bar', false],
      ['6.0.0', '5.1.4', false],
      ['5.1.4', '6.0.0', false],
      ['5.1.4-SNAPSHOT', '6.0.0-rc2-SNAPSHOT', false],
      ['5.1.4', '6.0.0-rc2-SNAPSHOT', false],
      ['5.1.4-SNAPSHOT', '6.0.0', false],
      ['5.1.4-SNAPSHOT', '6.0.0-rc2', false],
    ];

    for (const [plugin, kibana, shouldPass] of tests) {
      it(`${shouldPass ? 'should' : `shouldn't`} allow plugin: ${plugin} kibana: ${kibana}`, () => {
        expect(isVersionCompatible(plugin, kibana)).to.be(shouldPass);
      });
    }
  });
});
