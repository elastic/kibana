import _ from 'lodash';
export default (handleChange, refs) => {
  return (name, defaultValue) => (e) => {
    e.preventDefault();
    const part = {};
    const refKey = `${name}.value`;
    part[name] = Number(_.get(refs, refKey, defaultValue));
    if (_.isFunction(handleChange)) return handleChange(part);
  };
};
