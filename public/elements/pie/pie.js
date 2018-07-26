export const pie = () => ({
  name: 'pie',
  displayName: 'Pie chart',
  width: 300,
  height: 300,
  help: 'A customizable element for making pie charts from your data',
  image: 'clock',
  expression: `filters
| demodata
| pointseries color="state" size="max(price)"
| pie
| render`,
});
