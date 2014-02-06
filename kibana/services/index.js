define(function (require) {
  'use strict';

  var angular = require('angular');
  var app = require('app');
  var attachClusterState = require('./clusterState');

  var module = angular.module('marvel.services', []);
  app.useModule(module);

  attachClusterState(module);
  
  return module;

});