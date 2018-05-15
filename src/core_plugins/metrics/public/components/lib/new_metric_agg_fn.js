import uuid from 'uuid';
export default () => {
  return {
    id: uuid.v4(),
    type: 'count'
  };
};
