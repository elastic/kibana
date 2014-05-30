/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;

  var TableHead = require('./tableHead');
  var TableBody = require('./tableBody');

  return React.createClass({
    displayName: 'ClusterView',
    getInitialState: function () {
      return { labels: this.props.scope.labels, showing: this.props.scope.showing || [] };
    },
    setLabels: function (data) {
      if (data) {
        this.setState({ labels: data });
      }
    },
    setShowing: function (data) {
      if (data) {
        this.setState({ showing: data });
      }
    },
    componentWillMount: function () {
      this.props.scope.$watch('labels', this.setLabels);
      this.props.scope.$watch('showing', this.setShowing);
    },
    render: function () {
      var tableHead = TableHead({ columns: this.state.labels });
      var tableBody = TableBody({
        fitler: this.props.scope.filter,
        totalCount: this.props.scope.totalCount,
        rows: this.state.showing,
        cols: this.state.labels.length
      });
      return D.table(
        { cellPadding: 0, cellSpacing: 0, className: 'table table-bordered' },
        tableHead,
        tableBody
      );
    }
  });
});
