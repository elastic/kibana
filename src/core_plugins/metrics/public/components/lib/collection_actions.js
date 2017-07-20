import uuid from 'uuid';
import _ from 'lodash';
export function handleChange(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.map(row => {
    if (row.id === doc.id) return doc;
    return row;
  });
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

export function handleDelete(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.filter(row => row.id !== doc.id);
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

const newFn = () => ({ id: uuid.v1() });
export function handleAdd(props, fn = newFn) {
  if (!_.isFunction(fn)) fn = newFn;
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.concat([fn()]);
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

export default { handleAdd, handleDelete, handleChange };
