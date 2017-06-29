import { Element } from '../element';
import './flot';
import './plot.less';
import { size } from './plugins/size';
import header from './header.png';


const $ = window.$;
$.plot.plugins.push(size);

let plot;
module.exports = new Element({
  name: 'plot',
  displayName: 'Coordinate plot',
  description: 'An customizable XY plot for making line, bar or dot charts from your data',
  image: header,
  expression: 'demodata().pointseries(x="time", y="sum(price)", color="state").plot(defaultStyle=seriesStyle(lines="2"))',
  destroy(/*args*/) {
    //plot.destroy();
    //console.log('destroy plot', args);
  },
  render(domNode, config, done) {
    config.options.legend.labelBoxBorderColor = 'transparent';
    plot = $.plot($(domNode), config.data, config.options);
    return done(plot);
  },
});
