/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isConfigVersionUpgradeable } from './is_config_version_upgradeable';

describe('savedObjects/health_check/isConfigVersionUpgradeable', function () {
  function isUpgradeableTest(savedVersion: string, kibanaVersion: string, expected: boolean) {
    it(`should return ${expected} for config version ${savedVersion} and kibana version ${kibanaVersion}`, () => {
      expect(isConfigVersionUpgradeable(savedVersion, kibanaVersion)).toBe(expected);
    });
  }

  isUpgradeableTest('1.0.0-beta1', '7.4.0', false);
  isUpgradeableTest('1.0.0-beta256', '7.4.0', false);
  isUpgradeableTest('10.100.1000-beta256', '10.100.1000-beta257', false);
  isUpgradeableTest('7.4.0', '7.4.0', false);
  isUpgradeableTest('4.0.0-RC1', '4.0.0-RC2', true);
  isUpgradeableTest('10.100.1000-rc256', '10.100.1000-RC257', true);
  isUpgradeableTest('4.0.0-rc2', '4.0.0-rc1', false);
  isUpgradeableTest('4.0.0-rc2', '4.0.0', true);
  isUpgradeableTest('4.0.0-rc2', '4.0.2', true);
  isUpgradeableTest('4.0.1', '4.1.0-rc', true);
  isUpgradeableTest('4.0.0-rc1', '4.0.0', true);
  isUpgradeableTest('50.0.9-rc150', '50.0.9', true);
  isUpgradeableTest('50.0.9', '50.0.9-rc150', false);
  isUpgradeableTest('50.0.9', '50.0.10-rc150', true);
  isUpgradeableTest('4.0.0-rc1-SNAPSHOT', '4.0.0', false);
  isUpgradeableTest('4.1.0-rc1-SNAPSHOT', '4.1.0-rc1', false);
  isUpgradeableTest('5.0.0-alpha11', '5.0.0', false);
  isUpgradeableTest('50.0.10-rc150-SNAPSHOT', '50.0.9', false);
  isUpgradeableTest(undefined as any, '7.4.0', false);
  isUpgradeableTest('@@version', '7.4.0', false);
});
