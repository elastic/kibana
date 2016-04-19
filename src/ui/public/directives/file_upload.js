import $ from 'jquery';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');

module.directive('fileUpload', function ($parse) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      let onUpload = $parse(attrs.fileUpload);

      let $fileInput = $('<input type="file" style="opacity: 0" id="testfile" />');
      $elem.after($fileInput);

      $fileInput.on('change', function (e) {
        let reader = new FileReader();
        reader.onload = function (e) {
          $scope.$apply(function () {
            onUpload($scope, {fileContents: e.target.result});
          });
        };

        let target = e.srcElement || e.target;
        if (target && target.files && target.files.length) reader.readAsText(target.files[0]);
      });

      $elem.on('click', function (e) {
        $fileInput.val(null);
        $fileInput.trigger('click');
      });
    }
  };
});
