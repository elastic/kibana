define(function (require) {
  var $ = require('jquery');
  var html = require('text!components/clipboard/clipboard.html');

  require('modules')
    .get('kibana')
    .directive('kbnClipboard', function ($compile, $timeout) {
      return {
        restrict: 'E',
        template: html,
        replace: true,
        scope: {
          copyText: '=copy'
        },
        transclude: true,
        link: function ($scope, $el, attr) {
          $scope.tipPlacement = attr.tipPlacement || 'top';
          $scope.tipText = attr.tipText || 'Copy to clipboard';
          $scope.tipConfirm = attr.tipConfirm = 'Copied!';
          $scope.icon = attr.icon || 'fa-clipboard';

          $scope.shownText = $scope.tipText;

          $el.on('click', function () {
            $scope.shownText = $scope.tipConfirm;
            // Reposition tooltip to account for text length change
            $('a', $el).mouseenter();
          });

          $el.on('mouseleave', function () {
            $scope.shownText = $scope.tipText;
          });

          $scope.$on('$destroy', function () {
            $el.off('click');
            $el.off('mouseleave');
          });
        }
      };
    });
});