import _ from 'lodash';

module.exports = function (points) {
  return _.sum(points) / points.length;
};
