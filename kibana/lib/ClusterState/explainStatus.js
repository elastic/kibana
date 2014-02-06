define(function (require) {
  'use strict';
  var explain = require('./explain');
  var _ = require('lodash');

  var singleTemplate = function (status, index, counts ) {
    var message = '';
    var locals = { status: status, index: index, counts: counts };
    locals.type = (status === 'red') ? 'primary' : 'replica';

    message += _.template('<%- index %> has ', locals);
    var types = [];
    if (locals.counts.unassigned) {
      types.push(_.template('<%= counts.unassigned %> unassigned', locals));
    }
    if (locals.counts.initializing) {
      types.push(_.template('<%= counts.initializing %> initializing', locals));
    }
    locals.types = types.join(' and ');
    message += _.template('<%- types %> <%- type %> shards.', locals);
    return message;
  };

  var filter = function (subject) {
    return function (row) {
      return subject === row;
    };
  };

  return function (scope, index) {
    var plan = explain(scope.state);
    var yellowIndices = _.keys(plan.yellow);
    var redIndices = _.keys(plan.red);

    if (!_.isUndefined(index)) {
      redIndices = _.filter(redIndices, filter(index));
      yellowIndices = _.filter(yellowIndices, filter(index));
    }

    yellowIndices = _.difference(yellowIndices, redIndices);

    var messages = [];

    _.each(redIndices, function (index) {
      messages.push(singleTemplate('red', index, plan.red[index]));
    });

    _.each(yellowIndices, function (index) {
      messages.push(singleTemplate('yellow', index, plan.yellow[index]));
    });

    return messages;
    
  };

});
