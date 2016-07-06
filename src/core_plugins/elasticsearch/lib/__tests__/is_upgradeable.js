import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';

import isUpgradeable from '../is_upgradeable';
import pkg from '../../../../utils/package_json';
let version = pkg.version;

describe('plugins/elasticsearch', function () {
  describe('lib/is_upgradeable', function () {
    let server = {
      config: _.constant({
        get: function (key) {
          switch (key) {
            case 'pkg.version': return version;
            default: throw new Error(`no stub for config key ${key}`);
          }
        }
      })
    };

    function upgradeDoc(_id, _version, bool) {
      describe('', function () {
        before(function () { version = _version; });

        it(`should return ${bool} for ${_id} <= ${version}`, function () {
          expect(isUpgradeable(server, { _id: _id })).to.be(bool);
        });

        after(function () { version = pkg.version; });
      });
    }

    upgradeDoc('1.0.0-beta1', pkg.version, false);
    upgradeDoc(pkg.version, pkg.version, false);
    upgradeDoc('4.0.0-RC1', '4.0.0-RC2', true);
    upgradeDoc('4.0.0-rc2', '4.0.0-rc1', false);
    upgradeDoc('4.0.0-rc2', '4.0.0', true);
    upgradeDoc('4.0.0-rc2', '4.0.2', true);
    upgradeDoc('4.0.1', '4.1.0-rc', true);
    upgradeDoc('4.0.0-rc1', '4.0.0', true);
    upgradeDoc('4.0.0-rc1-SNAPSHOT', '4.0.0', false);
    upgradeDoc('4.1.0-rc1-SNAPSHOT', '4.1.0-rc1', false);
    upgradeDoc('5.0.0-alpha1', '5.0.0', false);

    it('should handle missing _id field', function () {
      let doc = {
        '_index': '.kibana',
        '_type': 'config',
        '_score': 1,
        '_source': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };

      expect(isUpgradeable(server, doc)).to.be(false);
    });

    it('should handle _id of @@version', function () {
      let doc = {
        '_index': '.kibana',
        '_type': 'config',
        '_id': '@@version',
        '_score': 1,
        '_source': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };
      expect(isUpgradeable(server, doc)).to.be(false);
    });

  });


});
