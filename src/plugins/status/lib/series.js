function Series(size) {
  this.size = size;
  this.data = [];
}

Series.prototype.push = function (value) {
  this.data.unshift([Date.now(), value]);
  if (this.data.length > this.size) this.data.pop();
};

Series.prototype.toJSON = function () {
  return this.data;
};

module.exports = Series;
