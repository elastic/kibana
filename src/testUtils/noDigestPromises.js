var Bluebird = require('bluebird');
require('ui/promises');

Bluebird.longStackTraces();

/**
 * replace the Promise service with Bluebird so that tests
 * can use promises without having to call $rootScope.apply()
 *
 * var noDigestPromises = require('testUtils/noDigestPromises');
 *
 * describe('some module that does complex shit with promises', function () {
 *   beforeEach(noDigestPromises.activate);
 *
 * });
 */

var active = false;

require('ui/modules')
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
