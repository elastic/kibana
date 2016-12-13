import _ from 'lodash';

function Samples(max) {
  this.vals = {};
  this.max = max || Infinity;
  this.length = 0;
}

Samples.prototype.add = function (sample) {
  const vals = this.vals;
  const length = this.length = Math.min(this.length + 1, this.max);

  _.forOwn(sample, function (val, name) {
    if (val == null) val = null;

    if (!vals[name]) vals[name] = new Array(length);
    vals[name].unshift([Date.now(), val]);
    vals[name].length = length;
  });
};

Samples.prototype.toJSON = function () {
  return this.vals;
};

module.exports = Samples;
