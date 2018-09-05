// This bit of hackiness is required because this isn't part of the main kibana bundle
import 'jquery';
import '../../lib/flot-charts';

import { debounce, includes } from 'lodash';
import { size } from './plugins/size';
import { text } from './plugins/text';
import './plot.scss';

const render = (domNode, config, handlers) => {
  // TODO: OH NOES
  if (!includes($.plot.plugins, size)) $.plot.plugins.push(size);
  if (!includes($.plot.plugins, text)) $.plot.plugins.push(text);

  let plot;
  function draw() {
    if (domNode.clientHeight < 1 || domNode.clientWidth < 1) return;

    try {
      if (!plot) {
        plot = $.plot($(domNode), config.data, config.options);
      } else {
        plot.resize();
        plot.setupGrid();
        plot.draw();
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

  return handlers.done();
};

export const plot = () => ({
  name: 'plot',
  displayName: 'Coordinate plot',
  help: 'Render an XY plot from your data',
  render,
});
