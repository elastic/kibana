export const lineChart = () => ({
  name: 'lineChart',
  displayName: 'Line Chart',
  help: 'A customizable line chart',
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle bars=0 lines=3 points=0}
| render`,
});
