import { openSans } from '../../../common/lib/fonts';
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
  metricFont={font size=48 family="${openSans.value}" color="#000000" align="center" lHeight=48} 
  labelFont={font size=14 family="${openSans.value}" color="#000000" align="center"}
| render`,
});
