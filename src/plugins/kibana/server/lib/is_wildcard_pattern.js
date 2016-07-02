import _ from 'lodash';

export default function (pattern) {
  return _.includes(pattern, '*');
}
