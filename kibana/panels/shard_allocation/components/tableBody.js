/* jshint maxlen:false, white:false, newcap:false  */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var Unassigned = require('./unassigned');
  var Assigned = require('./assigned');
  var ParentItem = require('./parentItem');

  return React.createClass({
    displayName: 'TableBody',
    createRow: function (data) {
      return D.tr(null, 
        ParentItem({ data: data, key: data.name }),
        data.unassigned && data.unassigned.length > 0 ? Unassigned({ shards: data.unassigned }) : this.props.cols === 3 ? D.td() : null,
        Assigned({ data: data.children })
      );
    },
    render: function () {
      var rows = this.props.rows.map(this.createRow);
      if (rows.length) {
        return D.tbody(null, rows);
      }
      var message = D.div(null, 
        D.p({ style: { margin: '10px 0' }, className: 'text-center lead mutted' })
      );
      return D.tbody(null, 
        D.tr(null, D.td({ colSpan: 2 }, message))
      );
    }
  }); 
});

