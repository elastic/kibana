import _ from 'lodash';
export default (fn, data) => {
  if (_.isNumber(data)) return data;
  if (!Array.isArray(data)) return 0;
  const values = data.map(v => v[1]);
  return _[fn](values);
};
