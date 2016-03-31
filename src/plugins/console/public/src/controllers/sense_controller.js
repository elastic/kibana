import 'ui/doc_title';
import 'ui/directives/kbn_top_nav';

require('ui/modules')
.get('app/sense')
.controller('SenseController', function SenseController($scope, docTitle) {

  docTitle.change('Sense');

  // require the root app code, which expects to execute once the dom is loaded up
  require('../app');

  const input = require('../input');
  const es = require('../es');

  this.sendSelected = () => {
    input.focus();
    input.sendCurrentRequestToES();
    return false;
  };

  this.autoIndent = (event) => {
    input.autoIndent();
    event.preventDefault();
    input.focus();
  };

  this.serverUrl = es.getBaseUrl();

  // read server url changes into scope
  es.addServerChangeListener((server) => {
    $scope.$evalAsync(() => {
      this.serverUrl = server;
    });
  });
});
