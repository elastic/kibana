define([
  'angular'
],
function (angular) {
  'use strict';

  var module = angular.module('kibana.directives');

  module.directive('dashUpload', function(timer, dashboard, alertSrv){
    return {
      restrict: 'A',
      link: function(scope) {
        function file_selected(evt) {
          var files = evt.target.files; // FileList object
          var readerOnload = function() {
            return function(event) {
              try {
                dashboard.dash_load(JSON.parse(event.target.result));
              }
              catch (err)  {
                alertSrv.set('Oops','The dashboard file you want to upload is malformed, please correct it and retry.','error');
              }
              scope.$apply();
            };
          };
          for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.onload = (readerOnload)(f);
            reader.readAsText(f);
          }
        }
        // Check for the various File API support.
        if (window.File && window.FileReader && window.FileList && window.Blob) {
          // Something
          document.getElementById('dashupload').addEventListener('change', file_selected, false);
        } else {
          alertSrv.set('Oops','Sorry, the HTML5 File APIs are not fully supported in this browser.','error');
        }
      }
    };
  });
});
