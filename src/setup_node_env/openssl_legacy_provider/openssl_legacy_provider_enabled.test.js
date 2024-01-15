/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var spawnSync = require('child_process').spawnSync;

describe('openSSLLegacyProviderEnabled', function () {
  function runLegacyProviderCheck(execOptions, nodeOptions) {
    var result = spawnSync(
      process.execPath,
      (execOptions ? execOptions.split(' ') : []).concat([
        '-p',
        "require('./openssl_legacy_provider_enabled')()",
      ]),
      {
        env: {
          NODE_OPTIONS: nodeOptions || '',
        },
        encoding: 'utf-8',
        cwd: __dirname,
      }
    );
    var stdout = result.stdout.trim();
    return stdout === 'true';
  }

  it('should be disabled by default', function () {
    expect(runLegacyProviderCheck()).toBe(false);
  });

  describe('using NODE_OPTIONS', function () {
    it('should be enabled when --openssl-legacy-provider is set', function () {
      expect(runLegacyProviderCheck(null, '--openssl-legacy-provider')).toBe(true);
    });

    it('should be enabled when --openssl-legacy-provider is set after --no-openssl-legacy-provider', function () {
      expect(
        runLegacyProviderCheck(null, '--no-openssl-legacy-provider --openssl-legacy-provider')
      ).toBe(true);
    });

    it('should be disabled when --no-openssl-legacy-provider is set', function () {
      expect(runLegacyProviderCheck(null, '--no-openssl-legacy-provider')).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set after --openssl-legacy-provider', function () {
      expect(
        runLegacyProviderCheck(null, '--openssl-legacy-provider --no-openssl-legacy-provider')
      ).toBe(false);
    });
  });

  describe('using exec arguments', function () {
    it('should be enabled when --openssl-legacy-provider is set', function () {
      expect(runLegacyProviderCheck('--openssl-legacy-provider')).toBe(true);
    });

    it('should be enabled when --openssl-legacy-provider is set after --no-openssl-legacy-provider', function () {
      expect(runLegacyProviderCheck('--no-openssl-legacy-provider --openssl-legacy-provider')).toBe(
        true
      );
    });

    it('should be disabled when --no-openssl-legacy-provider is set', function () {
      expect(runLegacyProviderCheck('--no-openssl-legacy-provider')).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set after --openssl-legacy-provider', function () {
      expect(runLegacyProviderCheck('--openssl-legacy-provider --no-openssl-legacy-provider')).toBe(
        false
      );
    });
  });
});
