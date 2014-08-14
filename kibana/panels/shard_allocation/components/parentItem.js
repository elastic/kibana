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
