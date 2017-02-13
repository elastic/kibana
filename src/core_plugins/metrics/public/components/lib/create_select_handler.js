import _ from 'lodash';
export default (handleChange) => {
  return (name) => (value) => {
    if (_.isFunction(handleChange)) {
      return handleChange({
        [name]: value && value.value || null
      });
    }
  };
};
