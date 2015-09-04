// invokes a series_function with the specified arguments
module.exports = function invokeSeriesFn(fn, args) {
  var promises = [fn(args)].concat(args);
  return Promise.all(promises).then(function (outputAndInput) {
    var result = {
      output: outputAndInput.shift(),
      input: outputAndInput
    };
    return result;
  });
};