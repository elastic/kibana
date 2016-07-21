define(function (require) {
  var module = require('ui/modules').get('kibana');
  var $ = require('jquery');

  module.directive('fileUpload', function ($parse) {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        var onUpload = $parse(attrs.fileUpload);

        var $fileInput = $('<input type="file" style="opacity: 0" id="testfile" />');
        $elem.after($fileInput);

        $fileInput.on('change', function (e) {
          var reader = new FileReader();
          reader.onload = function (e) {
            $scope.$apply(function () {
              onUpload($scope, {fileContents: e.target.result});
            });
          };

          var target = e.srcElement || e.target;
          if (target && target.files && target.files.length) reader.readAsText(target.files[0]);
        });

        $elem.on('click', function (e) {
          $fileInput.val(null);
          $fileInput.trigger('click');
        });
      }
    };
  });
});
