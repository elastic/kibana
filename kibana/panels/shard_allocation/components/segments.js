/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var _ = require('lodash');

  return React.createClass({
    displayName: 'Segments',
    getInitialState: function () {
      return { colors: this.props.scope.colors || [], total: this.props.scope.total };
    },
    componentWillMount: function () {
      var self = this;
      this.props.scope.$watch('colors', function (val) {
        self.setState({ colors: val });
      });
      this.props.scope.$watch('total', function (val) {
        self.setState({ total: val });
      });
    },
    createSegment: function (data) {
      var className = 'segment '+data.status;
      var width = ((data.count/this.state.total)*100)+'%';
      return D.div({ className: className, style: { width: width } }); 
    },
    render: function () {
      var segments = _.map(this.state.colors, this.createSegment);
      return D.div(null, segments);
    }
  });
    
});
