import header from './header.png';

export const verticalBarChart = () => ({
  name: 'verticalBarChart',
  displayName: 'Vertical Bar Chart',
  help: 'A customizable vertical bar chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle lines=0 bars="0.75" points=0} legend=false
| render`,
});
