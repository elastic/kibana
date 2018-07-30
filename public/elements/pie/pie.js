import header from './header.png';

export const pie = () => ({
  name: 'pie',
  displayName: 'Pie chart',
  width: 300,
  height: 300,
  help: 'A simple pie chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="state" size="max(price)"
| pie
| render`,
});
