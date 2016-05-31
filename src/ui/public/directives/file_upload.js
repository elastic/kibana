import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');

let html = '<span class="dropzone" ng-transclude></span>';

module.directive('fileUpload', function () {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      onRead: '&',
      onLocate: '&',
      uploadSelector: '@'
    },
    template: html,
    link: function ($scope, $elem, attrs) {
      let $button = $elem.find($scope.uploadSelector);
      let $dropzone = $elem.find('.dropzone');

      const handleFile = (file) => {
        if (_.isUndefined(file)) return;

        if (_.has(attrs, 'onRead')) {
          let reader = new FileReader();
          reader.onload = function (e) {
            $scope.$apply(function () {
              $scope.onRead({fileContents: e.target.result});
            });
          };
          reader.readAsText(file);
        }

        if (_.has(attrs, 'onLocate')) {
          $scope.$apply(function () {
            $scope.onLocate({ file });
          });
        }
      };

      $dropzone.on('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      );

      $dropzone.on('dragenter', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      );

      $dropzone.on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        const file = _.get(e, 'originalEvent.dataTransfer.files[0]');

        if (file) {
          handleFile(file);
        }
      });

      if ($button) {
        const $fileInput = $('<input type="file" style="opacity: 0; position:absolute; right: -999999999px" id="testfile" />');
        $elem.append($fileInput);

        $fileInput.on('change', function (e) {
          let target = e.srcElement || e.target;
          if (_.get(target, 'files.length')) {
            handleFile(target.files[0]);
          }
        });

        $button.on('click', function (e) {
          $fileInput.val(null);
          $fileInput.trigger('click');
        });
      }
    }
  };
});
