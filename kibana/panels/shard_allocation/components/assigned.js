/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var Shards = require('./shards');
  var calculateClass = require('../lib/calculateClass');
  var _ = require('lodash');
  var generateQueryAndLink = require('../lib/generateQueryAndLink');

  function sortByName (item) {
    if (item.type === 'node') {
      return [ !item.master, item.name];
    }
    return [ item.name ];
  }

  return React.createClass({
    displayName: 'Assigned',
    createChild: function (data) {
      var key = data.id; 
      var name = D.a({ href:generateQueryAndLink(data) }, 
       D.span(null, data.name)
      );
      return D.div({ className: calculateClass(data, 'child'), key: key },
        D.div({ className: 'title' },
          name,
          data.master ? D.span({ className: 'icon-star' }) : null
        ),
        Shards({ shards: data.children })
      );
    },
    render: function () {
      var data = _.sortBy(this.props.data, sortByName);
      return D.td({ className: 'children' },
        data.map(this.createChild) 
      );
    }
  });
});

