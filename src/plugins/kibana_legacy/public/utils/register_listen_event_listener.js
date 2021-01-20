/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function registerListenEventListener($rootScope) {
  /**
   * Helper that registers an event listener, and removes that listener when
   * the $scope is destroyed.
   *
   * @param  {EventEmitter} emitter - the event emitter to listen to
   * @param  {string} eventName - the event name
   * @param  {Function} handler - the event handler
   * @return {undefined}
   */
  $rootScope.constructor.prototype.$listen = function (emitter, eventName, handler) {
    emitter.on(eventName, handler);
    this.$on('$destroy', function () {
      emitter.off(eventName, handler);
    });
  };
}
