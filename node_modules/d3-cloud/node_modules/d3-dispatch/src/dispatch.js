function dispatch() {
  return new Dispatch(arguments);
}

function Dispatch(types) {
  var i = -1,
      n = types.length,
      callbacksByType = {},
      callbackByName = {},
      type,
      that = this;

  that.on = function(type, callback) {
    type = parseType(type);

    // Return the current callback, if any.
    if (arguments.length < 2) {
      return (callback = callbackByName[type.name]) && callback.value;
    }

    // If a type was specified…
    if (type.type) {
      var callbacks = callbacksByType[type.type],
          callback0 = callbackByName[type.name],
          i;

      // Remove the current callback, if any, using copy-on-remove.
      if (callback0) {
        callback0.value = null;
        i = callbacks.indexOf(callback0);
        callbacksByType[type.type] = callbacks = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
        delete callbackByName[type.name];
      }

      // Add the new callback, if any.
      if (callback) {
        callback = {value: callback};
        callbackByName[type.name] = callback;
        callbacks.push(callback);
      }
    }

    // Otherwise, if a null callback was specified, remove all callbacks with the given name.
    else if (callback == null) {
      for (var otherType in callbacksByType) {
        if (callback = callbackByName[otherType + type.name]) {
          callback.value = null;
          callbacks = callbacksByType[otherType];
          i = callbacks.indexOf(callback);
          callbacksByType[otherType] = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
          delete callbackByName[callback.name];
        }
      }
    }

    return that;
  };

  while (++i < n) {
    type = types[i] + "";
    if (!type || (type in that)) throw new Error("illegal or duplicate type: " + type);
    callbacksByType[type] = [];
    that[type] = applier(type);
  }

  function parseType(type) {
    var i = (type += "").indexOf("."), name = type;
    if (i >= 0) type = type.slice(0, i); else name += ".";
    if (type && !callbacksByType.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    return {type: type, name: name};
  }

  function applier(type) {
    return function() {
      var callbacks = callbacksByType[type], // Defensive reference; copy-on-remove.
          callbackValue,
          i = -1,
          n = callbacks.length;

      while (++i < n) {
        if (callbackValue = callbacks[i].value) {
          callbackValue.apply(this, arguments);
        }
      }

      return that;
    };
  }
}

dispatch.prototype = Dispatch.prototype; // allow instanceof

export default dispatch;
