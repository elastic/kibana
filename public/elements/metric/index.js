import header from './header.png';

export const metric = () => ({
  name: 'metric',
  displayName: 'Metric',
  help: 'A number with a label',
  width: 200,
  height: 100,
  image: header,
  expression: `filters
| demodata
| math "unique(country)"
| metric "Countries" 
  metricFont={font size=48 family="'Open Sans', Helvetica, Arial, sans-serif" color="#000000" align="center" lHeight=48} 
  labelFont={font size=14 family="'Open Sans', Helvetica, Arial, sans-serif" color="#000000" align="center"}
| render`,
});
