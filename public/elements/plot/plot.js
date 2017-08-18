import $ from 'jquery-flot';
import { debounce, includes } from 'lodash';
import { Element } from '../element';
import { size } from './plugins/size';
import header from './header.png';
import './plot.less';

export default new Element('plot', {
  displayName: 'Coordinate plot',
  description: 'An customizable XY plot for making line, bar or dot charts from your data',
  image: header,
  expression: 'demodata().pointseries(x="time", y="sum(price)", color="state").plot(defaultStyle=seriesStyle(points=5)).render()',
  render(domNode, config, done, events) {
    // TODO: OH NOES
    if (!includes($.plot.plugins, size)) $.plot.plugins.push(size);

    console.log(config);

    config.options.legend.labelBoxBorderColor = 'transparent';
    const plot = $.plot($(domNode), config.data, config.options);

    function resize() {
      plot.resize();
      plot.setupGrid();
      plot.draw();
    }

    function destroy() {
      plot.shutdown();
    }

    events.on('destroy', destroy);
    events.on('resize', debounce(resize, 40, { maxWait: 40 })); // 1000 / 40 = 25fps

    return done(plot);
  },
});
