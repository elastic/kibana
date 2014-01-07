define([
  'angular',
  'numeral'
],
function (angular) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('formatter', function() {
    // Save a reference to this
    var self = this;

    this.format = function(format, value) {
       switch (format) {
        case 'money':
          value = numeral(value).format('$0,0.00');
          break;
        case 'bytes':
          value = numeral(value).format('0.00b');
          break;
        case 'short':
          value = numeral(value).format('0.0a');
          break;
        case 'float':
          value = numeral(value).format('0.000');
          break;
        case 'none':
          break;
        default:
          value = numeral(value).format('0,0');
        }

        return value;
    };

  });

});
