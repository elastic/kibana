import header from './header.png';

export const grid = {
  name: 'grid',
  displayName: 'Grid',
  help: 'A colorable, sizable, grid for displaying a point series',
  image: header,
  expression: 'filters | demodata | pointseries x="project" y="state" size="median(price)" | grid | render',
};
