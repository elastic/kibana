module.exports = {
  request: function (request, args) {
    if (args[0]) {
      request.index = args[0];
    } else {
      throw new Error ('`in` requires an index');
    }
    return request;
  },
  result: null
}