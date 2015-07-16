module.exports = {
  request: function (request, args) {
    if (args[0] && args[1]) {
      request.body.aggs.series.aggs = {metric: {}};
      request.body.aggs.series.aggs.metric[args[0]] = {field: args[1]};
    } else {
      throw new Error ('`as` requires metric:field');
    }
    return request;
  },
  result: null
}