import routes from 'ui/routes';
import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/data/_review.html';
import storeProvider from 'ui/store';
import _ from 'lodash';

var testData = {
  message: 'src=1.1.1.1 evil=1',
  src: '1.1.1.1',
  evil: '1',
  coordinates: {
    lat: 37.3894,
    lon: 122.0819
  },
  '@timestamp': '2015-11-24T00:00:00.000Z'
};

routes.when('/settings/data/review', {
  template: template
});

modules.get('apps/settings')
  .controller('settingsDataReview', function ($scope, Private) {
    var store = Private(storeProvider);
    $scope.perPage = 25;
    $scope.columns = [
      {title: 'field'},
      {title: 'mapping'},
      {title: 'example', sortable: false},
      {title: '', sortable: false}
    ];

    $scope.rows = _.map(testData, (value, key) => {
      return [key, 'type', value, 'edit'];
    });
  });
