import _ from 'lodash';
export default (handleChange) => {
  return (name, defaultValue) => (e) => {
    e.preventDefault();
    const value = _.get(e, 'target.value', defaultValue);
    if (_.isFunction(handleChange)) {
      return handleChange({ [name]: value });
    }
  };
};
