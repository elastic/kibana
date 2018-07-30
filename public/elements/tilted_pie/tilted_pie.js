import header from './header.png';

export const tiltedPie = () => ({
  name: 'tiltedPie',
  displayName: 'Tilted Pie Chart',
  width: 500,
  height: 250,
  help: 'A customizable tilted pie chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="project" size="max(price)"
| pie tilt=0.5
| render`,
});
