import Bluebird from 'bluebird';
import '../ui/public/promises';
import uiModules from '../ui/public/modules';

Bluebird.longStackTraces();

/**
 * replace the Promise service with Bluebird so that tests
 * can use promises without having to call $rootScope.apply()
 *
 * let noDigestPromises = require('test_utils/no_digest_promises');
 *
 * describe('some module that does complex shit with promises', function () {
 *   beforeEach(noDigestPromises.activate);
 *
 * });
 */

let active = false;

uiModules
.get('kibana')
.config(function ($provide) {
  $provide.decorator('Promise', function ($delegate) {
    return active ? Bluebird : $delegate;
  });
});

function activate() { active = true; }
function deactivate() { active = false; }

module.exports = {
  activate: activate,
  deactivate: deactivate,
  activateForSuite: function () {
    before(activate);
    after(deactivate);
  }
};
