import header from './header.png';

export const plot = {
  name: 'plot',
  displayName: 'Coordinate plot',
  help: 'An customizable XY plot for making line, bar or dot charts from your data',
  image: header,
  expression: 'filters | demodata | pointseries x="time" y="sum(price)" color="state" | plot defaultStyle={seriesStyle points=5} | render',
};
