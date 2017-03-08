import _ from 'lodash';
export default (handleChange, model) => part => {
  const doc = _.assign({}, model, part);
  handleChange(doc);
};
