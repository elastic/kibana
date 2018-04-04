import expect from 'expect.js';
import { set } from 'lodash';
import BasePathProxy from '../base_path_proxy';

describe('CLI Cluster Manager', function () {
  describe('base_path_proxy constructor', function () {
    it('should throw an error when both server.ssl.keystore.path and server.ssl.certificate are specified', function () {
      const settings = {};
      set(settings, 'server.ssl.keystore.path', '/cert.p12');
      set(settings, 'server.ssl.certificate', './cert.crt');
      set(settings, 'server.ssl.key', './cert.key');

      expect(() => new BasePathProxy(null, settings)).to.throwError(
        `Invalid Configuration: please specify either "server.ssl.keystore.path" or "server.ssl.certificate", not both.`
      );
    });
  });
});
