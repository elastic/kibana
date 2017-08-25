import $ from 'jquery-flot';
import { debounce } from 'lodash';
import header from './header.png';
import { Element } from '../element';

export default new Element('pie', {
  displayName: 'Pie chart',
  description: 'An customizable element for making pie charts from your data',
  image: header,
  expression: 'demodata | pointseries x="time" y="sum(price)" color="state" | pie | render',
  render(domNode, config, handlers) {
    config.options.legend.labelBoxBorderColor = 'transparent';
    const plot = $.plot($(domNode), config.data, config.options);

    function resize() {
      plot.resize();
      plot.draw();
    }

    function destroy() {
      plot.shutdown();
    }

    handlers.onDestroy(destroy);
    handlers.onResize(debounce(resize, 40, { maxWait: 40 })); // 1000 / 40 = 25fps

    return handlers.done(plot);
  },
});
