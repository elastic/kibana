import { debounce } from 'lodash';
import '../lib/flot';

export const pie = {
  name: 'pie',
  displayName: 'Pie chart',
  help: 'Render a pie chart from data',
  render(domNode, config, handlers) {
    config.options.legend.labelBoxBorderColor = 'transparent';

    let plot;
    function draw() {
      if (domNode.clientHeight < 1 || domNode.clientWidth < 1) return;

      try {
        if (!plot) {
          if (!config.data || !config.data.length) {
            $(domNode).empty();
          } else {
            plot = $.plot($(domNode), config.data, config.options);
            $('.pieLabel > div', domNode).css(config.font.spec);
          }
        } else {
          plot.resize();
          plot.draw();
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
};
