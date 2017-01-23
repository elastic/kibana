import uuid from 'uuid/v4';
import _ from 'lodash';

export const getElementTemplate = (props) => {
  const template = {
    id: uuid(),
    type: 'json',
    height: 100,
    width: 200,
    top: 0,
    left: 0,
    angle: 0,
    args: {}
  };

  const element = Object.assign({}, template, props);
  return element;
};

export const getPageTemplate = () => {
  return {
    id: uuid(),
    style: {
      backgroundColor: '#fff'
    },
    elements: [] // Same deal here. I'm watching you.
  };
};
