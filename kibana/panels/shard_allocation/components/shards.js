/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
      var additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
      var node = relocating ? shard.relocating_node : shard.node;
      return shard.index+'.'+node+'.'+shardType+'.'+shard.shard+additionId;
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
      var type = shard.primary ? 'primary' : 'replica';
      var additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
      var key = shard.index+'.'+shard.node+'.'+type+'.'+shard.state+'.'+shard.shard+additionId;
      return Shard({ shard: shard, key: key });
    },
    render: function () {
      return D.div({ className: 'shards' }, 
        _.sortBy(this.props.shards, sortByShard).map(this.createShard)
      );
    }
  });

});
