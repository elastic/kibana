const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const keysDeep = require('../lib/keys_deep.js');

app.directive('objectChanges', function () {
  return {
    restrict: 'E',
    template: require('../views/object_changes.html'),
    controller: function ($scope) {

      var obj = {
        '_raw' : '11/24/2015 -- src=1.1.1.1 evil=1',
        '@timestamp' : '11/24/2015',
        'message' : 'src=1.1.1.1 evil=1'
      };

      console.log(keysDeep(obj));


      $scope.lines = [
        { state: 'neutral', text: '{' },
        { state: 'neutral', text: '  "_raw": "11/24/2015 -- src=1.1.1.1 evil=1' },
        { state: 'added', text: '+ "@timestamp": "11/24/2015"' },
        { state: 'added', text: '+ "message": "src=1.1.1.1 evil=1"' },
        { state: 'removed', text: '- "oldfield": "I was removed"' },
        { state: 'neutral', text: '}' }
      ];

      // $scope.lines.forEach(line => {
      //   line.text = line.text.replace(/ /g, '&nbsp;');
      // });
    }
  }
});
