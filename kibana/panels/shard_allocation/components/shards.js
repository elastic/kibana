/* jshint newcap:false  */
define(function (require) {
  'use strict';
  var _ = require('lodash');
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var calculateClass = require('../lib/calculateClass');
  var $ = require('jquery');
  var vents = require('../lib/vents');

  function sortByShard (shard) {
    if (shard.node) {
      return shard.shard;
    }
    return [!shard.primary, shard.shard];
  }

  var Shard = React.createClass({
    displayName: 'Shard',
    componentDidMount: function () {
      var key, element;
      var shard = this.props.shard;
      var placement = shard.state === 'INITIALIZING' ? 'bottom' : 'top';
      if (shard.relocating_message) {
        key = this.generateKey();
        element = this.getDOMNode();
        $(element).tooltip({
          title: shard.relocating_message,
          animation: false,
          placement: placement
        });
        vents.on(key, function (action) {
          $(element).tooltip(action);
        });
      }
    },
    generateKey: function (relocating) {
      var shard = this.props.shard;
      var shardType = shard.primary ? 'primary' : 'replica';
      var node = relocating ? shard.relocating_node : shard.node;
      return shard.index+':'+node+':'+shardType+':'+shard.shard;
    },
    componentWillUnmount: function () {
      var key, element;
      var shard = this.props.shard;
      if (shard.relocating_message) {
        element = this.getDOMNode();
        key = this.generateKey();
        $(element).tooltip('destroy');
        vents.clear(key);
      }
    },
    toggle: function (event) {
      if (this.props.shard.relocating_message) {
        var action = (event.type === 'mouseenter') ? 'show' : 'hide';
        var key = this.generateKey(true);
        vents.trigger(key, action);
      }
    },
    render: function () {
      var shard = this.props.shard;
      var options = {
        className: calculateClass(shard, 'shard'),
        onMouseEnter: this.toggle,
        onMouseLeave: this.toggle
      };
      return D.div(options, shard.shard  );
    }
  });

  return React.createClass({
    displayName: 'Shards',
    createShard: function (shard) {
      var key = [];
      key.push('shard.'+shard.shard);
      key.push(shard.state);
      key.push(shard.primary ? 'primary' : 'replica');
      return Shard({ shard: shard, key: key.join('.') });
    },
    render: function () {
      return D.div({ className: 'shards' }, 
        _.sortBy(this.props.shards, sortByShard).map(this.createShard)
      );
    }
  });

});
