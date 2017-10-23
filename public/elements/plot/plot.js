import { debounce, includes } from 'lodash';
import { size } from './plugins/size';
import { text } from './plugins/text';

import header from './header.png';
import '../../lib/flot';
import './plot.less';

export default {
  name: 'plot',
  displayName: 'Coordinate plot',
  description: 'An customizable XY plot for making line, bar or dot charts from your data',
  image: header,
  expression: 'filters | demodata | pointseries x="time" y="sum(price)" color="state" | plot defaultStyle={seriesStyle points=5} | render',
  render(domNode, config, handlers) {
    // TODO: OH NOES
    if (!includes($.plot.plugins, size)) $.plot.plugins.push(size);
    if (!includes($.plot.plugins, text)) $.plot.plugins.push(text);

    let plot;
    function draw() {
      if (domNode.clientHeight < 1 || domNode.clientWidth < 1) return;

      try {
        if (!plot) {
          plot = $.plot($(domNode), config.data, config.options);
          $('.legendLabel, .flot-tick-label, .valueLabel', domNode).css(config.font.spec);
        } else {
          plot.resize();
          plot.setupGrid();
          plot.draw();
          $('.legendLabel, .flot-tick-label, .valueLabel', domNode).css(config.font.spec);
        }
      } catch (e) {
        // Nope
      }

    }

    function destroy() {
      if (plot) plot.shutdown();
    }

    handlers.onDestroy(destroy);
    handlers.onResize(debounce(draw, 40, { maxWait: 40 })); // 1000 / 40 = 25fps

    draw();

    return handlers.done(plot);
  },
};
