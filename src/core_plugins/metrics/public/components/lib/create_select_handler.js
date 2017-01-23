import _ from 'lodash';
export default (handleChange) => {
  return (name) => (value) => {
    const part = {};
    part[name] = value && value.value || null;
    if (_.isFunction(handleChange)) return handleChange(part);
  };
};
