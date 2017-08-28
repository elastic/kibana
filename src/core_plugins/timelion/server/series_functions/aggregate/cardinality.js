import _ from 'lodash';

export default function (points) {
  return _.uniq(points).length;
}
