import _ from 'lodash';
define(function (require) {

  return {
    order: 3,
    name: 'status',
    display: 'Status',
    url: function () {
      return '/status';
    }
  };
});
