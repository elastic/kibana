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
    colors: [
      '#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35',
      '#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643',
      '#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f',
      '#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f',
      '#000000', '#444444', '#777777', '#BBBBBB', '#FFFFFF', 'rgba(255,255,255,0)', // 'transparent'
    ],
  };
};
