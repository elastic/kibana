define(function (require) {
  return function VisDetailsSpyProvider(Notifier, $filter, $rootScope, config) {
    return {
      name: 'vis',
      display: 'Vis Details',
      template: require('text!plugins/vis_details_spy/vis_details.html'),
      order: 5,
      link: function tableLinkFn($scope, $el) {
      }
    };
  };
});
