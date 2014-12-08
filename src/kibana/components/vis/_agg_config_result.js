define(function (require) {
  return function AggConfigResultProvider() {

    function AggConfigResult(aggConfig, parent, value) {
      this.$parent = parent;
      this.value = value;
      this.aggConfig = aggConfig;

      if (aggConfig.schema.group === 'buckets') {
        this.type = 'bucket';
      } else {
        this.type = 'metric';
      }
    }

    /**
     * Returns an array of the aggConfigResult and parents up te branch
     * @returns {array} Array of aggConfigResults
     */
    AggConfigResult.prototype.getPath = function () {
      return (function walk(result, path) {
        path.unshift(result);
        if (result.$parent) return walk(result.$parent, path);
        return path;
      })(this, []);
    };

    /**
     * Returns an Elasticsearch filter that represents the result.
     * @returns {object} Elasticsearch filter
     */
    AggConfigResult.prototype.createFilter = function () {
      return this.aggConfig.createFilter(this.key);
    };

    return AggConfigResult;

  };
});
