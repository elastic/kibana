define(function () {
  'use strict';

  return function refreshState(service, getState, getIndices) {
    return getIndices().then(function (indices) {
      var success = function (state) {
        // Check the state is valid and emit an update event
        if (state && state['@timestamp'] !== service.version) {
          service.state = state;
          service.version = state['@timestamp'];
          service.$emit('update', state);
        }
        return state;
      };

      var error = function (err) {
        service.$emit('error', err);
        return err;
      };

      // Get the state... when we get a new version we need to emit an update
      return getState(indices).then(success, error);
    });
  };
    
});
