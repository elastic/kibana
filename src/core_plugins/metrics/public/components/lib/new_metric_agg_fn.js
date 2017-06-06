import uuid from 'uuid';
export default () => {
  return {
    id: uuid.v1(),
    type: 'count'
  };
};
