// This bit of hackiness is required because this isn't part of the main kibana bundle
import 'jquery';
import '../../lib/flot-charts';
import inlineStyle from 'inline-style';
import { debounce, includes } from 'lodash';
import { pie as piePlugin } from './plugins/pie';

export const pie = () => ({
  name: 'pie',
  displayName: 'Pie chart',
  help: 'Render a pie chart from data',
  reuseDomNode: false,
  render(domNode, config, handlers) {
    if (!includes($.plot.plugins, piePlugin)) $.plot.plugins.push(piePlugin);

    config.options.legend.labelBoxBorderColor = 'transparent';

    if (config.font) {
      const labelFormatter = (label, slice) => {
        // font color defaults to slice color if not specified
        const fontSpec = { ...config.font.spec, color: config.font.spec.color || slice.color };
        return `<div style="${inlineStyle(fontSpec)}"
        >
        ${label}
        <br/>
        ${Math.round(slice.percent)}%
        </div>`;
      };

      config.options.series.pie.label.formatter = labelFormatter;
    }

    let plot;
    function draw() {
      if (domNode.clientHeight < 1 || domNode.clientWidth < 1) return;

      try {
        $(domNode).empty();
        if (!config.data || !config.data.length) {
          $(domNode).empty();
        } else {
          plot = $.plot($(domNode), config.data, config.options);
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
