define(function (require) {
  return function VisSpyTable(Notifier, $filter, $rootScope, config) {
    return {
      name: 'vis',
      display: 'Vis Details',
      template: require('text!components/visualize/spy/_vis.html'),
      link: function tableLinkFn($scope, $el) {

      }
    };
  };
});
