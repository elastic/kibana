import { Element } from '../element';
import './flot';
import './plot.less';
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
  destroy(args) {
    //plot.destroy();
    console.log('destory plot', args);
  },
  render(domNode, config, done) {
    config.options.legend.labelBoxBorderColor = 'transparent';
    plot = $.plot($(domNode), config.data, config.options);
    return done(plot);
  },
});
