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



define(function () {
  'use strict';
  return function (item, initial) {
    var classes = [item.type];
    if (initial) {
      classes.push(initial);
    }
    if (item.type === 'shard') {
      classes.push((item.primary && 'primary') || 'replica');
      classes.push(item.state.toLowerCase());
      if (item.state === 'UNASSIGNED' &&  item.primary) {
        classes.push('emergency');
      }
    }
    if (item.master) {
      classes.push('master');
    }
    return classes.join(' ');
  };
});
