import uuid from 'node-uuid';
export default () => {
  return {
    id: uuid.v1(),
    type: 'count'
  };
};
