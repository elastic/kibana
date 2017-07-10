import _ from 'lodash';
import expect from 'expect.js';

import isUpgradeable from '../is_upgradeable';
import { pkg } from '../../../../utils';
let version = pkg.version;

describe('plugins/elasticsearch', function () {
  describe('lib/is_upgradeable', function () {
    const server = {
      config: _.constant({
        get: function (key) {
          switch (key) {
            case 'pkg.version': return version;
            default: throw new Error(`no stub for config key ${key}`);
          }
        }
      })
    };

    function upgradeDoc(id, _version, bool) {
      describe('', function () {
        before(function () { version = _version; });

        it(`should return ${bool} for ${id} <= ${version}`, function () {
          expect(isUpgradeable(server, { id: id })).to.be(bool);
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

    it('should handle missing id field', function () {
      const configSavedObject = {
        'type': 'config',
        'attributes': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };

      expect(isUpgradeable(server, configSavedObject)).to.be(false);
    });

    it('should handle id of @@version', function () {
      const configSavedObject = {
        'type': 'config',
        'id': '@@version',
        'attributes': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };
      expect(isUpgradeable(server, configSavedObject)).to.be(false);
    });

  });


});
