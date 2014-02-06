/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var Shards = require('./shards'); 
  
  return React.createClass({
    displayName: 'Unassigned',
    render: function () {
      return D.td({ className: 'children unassigned' },
        Shards({ shards: this.props.shards })
      );
    }
  });
});
