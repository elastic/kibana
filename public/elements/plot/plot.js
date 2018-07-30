import header from './header.png';

export const plot = () => ({
  name: 'plot',
  displayName: 'Coordinate plot',
  help: 'Mixed line, bar or dot charts',
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="sum(price)" color="state"
| plot defaultStyle={seriesStyle points=5}
| render`,
});
