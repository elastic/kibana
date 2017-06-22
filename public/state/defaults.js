import uuid from 'uuid/v4';

function getID(type) {
  return `${type}-${uuid()}`;
}

export const getDefaultPage = () => {
  return {
    id: getID('page'),
    name: 'Name of the page',
    style: {
      backgroundColor: '#fff',
    },
    elements: [],
  };
};

export const getDefaultWorkpad = () => {
  const page = getDefaultPage();
  return {
    name: 'Untitled Workpad',
    id: getID('workpad'),
    width: 600,
    height: 720,
    page: 0,
    pages: [page],
  };
};
