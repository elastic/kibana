import header from './header.png';

export const lineChart = () => ({
  name: 'lineChart',
  displayName: 'Line Chart',
  help: 'A customizable line chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle bars=0 lines=3 points=0}
| render`,
});
