import { Element } from '../element';
import './flot';
import { size } from './plugins/size';

const $ = window.$;
$.plot.plugins.push(size);

let plot;
module.exports = new Element({
  name: 'plot',
  displayName: 'An XY coordinate plot',
  icon: null,
  schema: {
    datasource: true,
    model: 'pointseries',
  },
  destroy(plot) {
    //plot.destroy();
    console.log(plot);
  },
  render(domNode, config, done) {
    plot = $.plot($(domNode), config.data, config.options);
    return done(plot);
  },
});
