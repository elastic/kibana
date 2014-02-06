define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var D = React.DOM;
  var generateQueryAndLink = require('../lib/generateQueryAndLink');

  return React.createClass({
    displayName: 'ParentItem',
    render: function () {
      var data = this.props.data;
      var className = ['parentName'];
      if (data.unassignedPrimaries) {
        className.push('text-error');
      }
      var name = D.a({ href:generateQueryAndLink(data) }, 
       D.span(null, data.name)
      );
      return D.td({ nowrap: true  },
        D.div({ className: className.join(' ') }, 
          name,
          data.master ? D.span({ className: 'icon-star' }, null) : null
        ),
        data.details ? D.div({ className: 'details' }, data.details) : null
      );
    }
  });
});
