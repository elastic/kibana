import getBasicAuthRealm from '../get_basic_auth_realm';
import expect from 'expect.js';
const exception = '[security_exception] missing authentication token for REST request [/logstash-*/_search],' +
                  ' with: {"header":{"WWW-Authenticate":"Basic realm=\\"shield\\""}}';


describe('plugins/elasticsearch', function () {
  describe('lib/get_basic_auth_realm', function () {

    it('should return null if passed something other than a string', function () {
      expect(getBasicAuthRealm({})).to.be(null);
      expect(getBasicAuthRealm(500)).to.be(null);
      expect(getBasicAuthRealm([exception])).to.be(null);
    });

    // TODO: This should be updated to match header strings when the client supports that
    it('should return the realm when passed an elasticsearch security exception', function () {
      expect(getBasicAuthRealm(exception)).to.be('shield');
    });

    it('should return null when no basic realm information is found', function () {
      expect(getBasicAuthRealm('Basically nothing="the universe"')).to.be(null);
    });

  });
});

