import { debounce, includes } from 'lodash';
import '../../lib/flot-charts';
import $ from 'jquery';
import { pie as piePlugin } from './plugins/pie';

export const pie = () => ({
  name: 'pie',
  displayName: 'Pie chart',
  help: 'Render a pie chart from data',
  reuseDomNode: false,
  render(domNode, config, handlers) {
    if (!includes($.plot.plugins, piePlugin)) $.plot.plugins.push(piePlugin);

    config.options.legend.labelBoxBorderColor = 'transparent';

    let plot;
    function draw() {
      if (domNode.clientHeight < 1 || domNode.clientWidth < 1) return;

      try {
        $(domNode).empty();
        if (!config.data || !config.data.length) {
          $(domNode).empty();
        } else {
          plot = $.plot($(domNode), config.data, config.options);
          $('.pieLabel > div', domNode).css(config.font.spec);
        }
      } catch (e) {
        console.log(e);
        // Nope
      }
    }

    function destroy() {
      if (plot) plot.shutdown();
    }

    handlers.onDestroy(destroy);
    handlers.onResize(debounce(draw, 40, { maxWait: 40 })); // 1000 / 40 = 25fps

    draw();

    return handlers.done();
  },
});
