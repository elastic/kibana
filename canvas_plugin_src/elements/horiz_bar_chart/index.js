import header from './header.png';

export const horizontalBarChart = () => ({
  name: 'horizontalBarChart',
  displayName: 'Horizontal Bar Chart',
  help: 'A customizable horizontal bar chart',
  image: header,
  expression: `filters
| demodata
| pointseries x="size(cost)" y="project" color="project"
| plot defaultStyle={seriesStyle lines=0 bars="0.75" points=0 horizontalBars=true} legend=false
| render`,
});
