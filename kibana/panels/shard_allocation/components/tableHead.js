define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;

  return React.createClass({
    displayName: 'TableHead',
    createColumn: function (label) {
      return D.th({ key: label }, label);
    },
    render: function () {
      var columns = this.props.columns.map(this.createColumn);
      return D.thead({}, D.tr({}, columns));
    }
  });
});
