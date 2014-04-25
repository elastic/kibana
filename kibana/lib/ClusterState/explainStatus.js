define(function (require) {
    'use strict';
    var groupIndicesByState = require('./groupIndicesByState');
    var _ = require('lodash');

    var singleTemplate = function (status, index, counts) {
        // kibana messes up with this
        var currentSettings = _.templateSettings;
        _.templateSettings = {
          escape: /<%-([\s\S]+?)%>/g,
          evaluate: /<%([\s\S]+?)%>/g,
          interpolate: /<%=([\s\S]+?)%>/g
        };


        var message = '';
        var locals = { status: status, index: index, counts: counts };
        if (status === 'red') {
          locals.type = { single: 'primary', multi: 'primaries' };
        }
        else {
          locals.type = { single: 'replica', multi: 'replicas' };
        }

        message += '<%- index %> has ';

        // index has 5 unassigned primaries
        if (counts.unassigned) {
          message += counts.unassigned == 1 ? "an unassigned <%- type.single %>" :
            "<%= counts.unassigned %> unassigned <%- type.multi %>";
        }
        else {
          message += counts.initializing == 1 ? "an initializing <%- type.single %>" :
            "<%= counts.initializing %> initializing <%- type.multi %>";
        }

        message = _.template(message, locals);
        _.templateSettings = currentSettings;
        return message;
      }
      ;

    var filter = function (subject) {
      return function (row) {
        return subject === row;
      };
    };

    var hiddenLast = function (name) {
      return [/^\./.test(name), name]; 
    };

    return function (service, index, indicesByState) {
      if (!indicesByState) {
        indicesByState = groupIndicesByState(service);
      }
      var yellowIndices = _(indicesByState.yellow).keys().sortBy(hiddenLast).value();
      var redIndices = _(indicesByState.red).keys().sortBy(hiddenLast).value();

      if (!_.isUndefined(index)) {
        redIndices = _.filter(redIndices, filter(index));
        yellowIndices = _.filter(yellowIndices, filter(index));
      }

      yellowIndices = _.difference(yellowIndices, redIndices);

      var messages = [];

      _.each(redIndices, function (index) {
        messages.push(singleTemplate('red', index, indicesByState.red[index]));
      });

      _.each(yellowIndices, function (index) {
        messages.push(singleTemplate('yellow', index, indicesByState.yellow[index]));
      });


      return messages;

    };

  }
)
;
