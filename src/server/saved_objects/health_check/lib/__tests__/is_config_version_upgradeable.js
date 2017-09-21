import expect from 'expect.js';

import { isConfigVersionUpgradeable } from '../is_config_version_upgradeable';
import { pkg } from '../../../../../utils';

describe('savedObjects/health_check/isConfigVersionUpgradeable', function () {
  function runTest(savedVersion, kibanaVersion, expected) {
    it(`should return ${expected} for config version ${savedVersion} and kibana version ${kibanaVersion}`, () => {
      expect(isConfigVersionUpgradeable(savedVersion, kibanaVersion)).to.be(expected);
    });
  }

  runTest('1.0.0-beta1', pkg.version, false);
  runTest(pkg.version, pkg.version, false);
  runTest('4.0.0-RC1', '4.0.0-RC2', true);
  runTest('4.0.0-rc2', '4.0.0-rc1', false);
  runTest('4.0.0-rc2', '4.0.0', true);
  runTest('4.0.0-rc2', '4.0.2', true);
  runTest('4.0.1', '4.1.0-rc', true);
  runTest('4.0.0-rc1', '4.0.0', true);
  runTest('4.0.0-rc1-SNAPSHOT', '4.0.0', false);
  runTest('4.1.0-rc1-SNAPSHOT', '4.1.0-rc1', false);
  runTest('5.0.0-alpha1', '5.0.0', false);
  runTest(undefined, pkg.version, false);
  runTest('@@version', pkg.version, false);
});
