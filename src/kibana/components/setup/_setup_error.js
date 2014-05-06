define(function (require) {
  return function SetupErrorFactory(configFile) {
    var _ = require('lodash');

    function SetupError(template, err) {
      // don't override other setup errors
      if (err && err instanceof SetupError) return err;

      var err2 = new Error(_.template(template, { configFile: configFile }));
      if (err) {
        err2.origError = err;
        if (err.stack) err2.stack = err.stack;
      }
      return err2;
    }
    return SetupError;
  };
});