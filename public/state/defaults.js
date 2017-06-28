import uuid from 'uuid/v4';

function getID(type) {
  return `${type}-${uuid()}`;
}

export const getDefaultElement = () => {
  return {
    id: getID('element'),
    position: {
      top: 20,
      left: 20,
      height: 500,
      width: 700,
      angle: 0,
    },
    expression: `
      demodata()
      .pointseries(y="median(cost)", x=time, color="project")
      .plot(defaultStyle=seriesStyle(lines=1))
    `,
  };
};

export const getDefaultPage = () => {
  return {
    id: getID('page'),
    style: {
      background: '#fff',
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
