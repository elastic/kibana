module.exports = function (stoch) {
  var origGet = stoch.get;
  stoch.get = function () {
    return Math.round(origGet.call(stoch));
  };
  return stoch;
};