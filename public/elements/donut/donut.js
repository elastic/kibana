import header from './header.png';

export const donut = () => ({
  name: 'donut',
  displayName: 'Donut Chart',
  help: 'A customizable donut chart',
  image: header,
  expression: `filters
| demodata
| pointseries color="project" size="max(price)"
| pie hole=50 labels=false legend="ne"
| render`,
});
