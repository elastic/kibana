const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('sourceData', function () {
  return {
    restrict: 'E',
    scope: {
      outputObject: '='
    },
    template: require('../views/source_data.html'),
    controller: function ($scope, debounce) {
      function refreshFieldData() {
        $scope.fieldData = _.get($scope.inputObject, $scope.sourceField);
        refreshOutput();
      }
      refreshFieldData = debounce(refreshFieldData, 100);

      function getProcessorOutput() {
        let newObj = {};
        try {
          newObj = JSON.parse($scope.inputText);
        } catch(er) { }

        return newObj
      }

      function refreshOutput() {
        const processorOutput = getProcessorOutput();

        objectManager.update($scope.outputObject, $scope.inputObject, processorOutput);
      }
      refreshOutput = debounce(refreshOutput, 200);

      $scope.inputText =
`{
"_raw": "11/24/2015 - - src=1.1.1.1 evil=1",
"_deal": "I am a simple string"
}`;
      $scope.inputObject = _.cloneDeep($scope.outputObject);
      $scope.$watch('inputText', refreshOutput);
    }
  };
});



// const app = require('ui/modules').get('kibana');
// const _ = require('lodash');
// const objectManager = require('../lib/object_manager');

// app.directive('sourceData', function () {
//   return {
//     restrict: 'E',
//     scope: {
//       outputObject: '='
//     },
//     template: require('../views/source_data.html'),
//     controller: function ($scope, debounce) {
//       $scope.inputText =
// `{
// "_raw": "11/24/2015 - - src=1.1.1.1 evil=1",
// "_deal": "I am a simple string"
// }`;
//       $scope.inputObject = {};

//       function updateSourceObject() {
//         try {
//           let newObj = JSON.parse($scope.inputText);
//         objectManager.update($scope.outputObject, $scope.inputObject, processorOutput);


//           $scope.outputObject = JSON.parse($scope.inputText);
//         } catch(er) { }
//       }
//       updateSourceObject = debounce(updateSourceObject, 200);

//       $scope.$watch('inputText', function() {
//         updateSourceObject();
//       });
//     }
//   };
// });
