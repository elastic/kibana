/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

describe('openSSLLegacyProviderEnabled', function () {
  var env = process.env;
  var execArgv = process.execArgv;

  beforeEach(function () {
    jest.resetModules();
    process.env.NODE_OPTIONS = '';
    process.execArgv = [];
  });

  afterAll(function () {
    process.env = env;
    process.execArgv = execArgv;
  });

  describe('using NODE_OPTIONS', function () {
    it('should be enabled when --openssl-legacy-provider is set', function () {
      process.env.NODE_OPTIONS = '--openssl-legacy-provider';
      expect(require('./openssl_legacy_provider_enabled')()).toBe(true);
    });

    it('should be enabled when --openssl-legacy-provider is set after --no-openssl-legacy-provider', function () {
      process.env.NODE_OPTIONS = '--no-openssl-legacy-provider --openssl-legacy-provider';
      expect(require('./openssl_legacy_provider_enabled')()).toBe(true);
    });

    it('should be disabled by default', function () {
      process.env.NODE_OPTIONS = '';
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set', function () {
      process.env.NODE_OPTIONS = '--no-openssl-legacy-provider';
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set after --openssl-legacy-provider', function () {
      process.env.NODE_OPTIONS = '--openssl-legacy-provider --no-openssl-legacy-provider';
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });
  });

  describe('using exec arguments', function () {
    it('should be enabled when --openssl-legacy-provider is set', function () {
      process.execArgv = ['--openssl-legacy-provider'];
      expect(require('./openssl_legacy_provider_enabled')()).toBe(true);
    });

    it('should be enabled when --openssl-legacy-provider is set after --no-openssl-legacy-provider', function () {
      process.execArgv = ['--no-openssl-legacy-provider', '--openssl-legacy-provider'];
      expect(require('./openssl_legacy_provider_enabled')()).toBe(true);
    });

    it('should be disabled by default', function () {
      process.execArgv = [];
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set', function () {
      process.execArgv = ['--no-openssl-legacy-provider'];
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });

    it('should be disabled when --no-openssl-legacy-provider is set after --openssl-legacy-provider', function () {
      process.execArgv = ['--openssl-legacy-provider', '--no-openssl-legacy-provider'];
      expect(require('./openssl_legacy_provider_enabled')()).toBe(false);
    });
  });
});
