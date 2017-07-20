import _ from 'lodash';

module.exports = function (points) {
  return _.uniq(points).length;
};
