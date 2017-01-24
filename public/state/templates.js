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

export const getDataframeTemplate = () => {
  return {
    id: uuid(),
    name: 'Cars',
    type: 'csv',
    value: {
      csv:'"make","model","year","price"\n' +
          '"Subaru","Impreza",2003,17695\n' +
          '"Subaru","Impreza",2004,18020\n' +
          '"Subaru","Impreza",2005,18245\n' +
          '"Subaru","Baja",2003,21995\n' +
          '"Subaru","Baja",2004,21995\n' +
          '"Subaru","Baja",2005,22345\n' +
          '"Subaru","Outback",2003,23245\n' +
          '"Subaru","Outback",2004,23470\n' +
          '"Subaru","Outback",2005,24445\n'
    }
  };
};
