import { Element } from '../element';
import './flot';
import { size } from './plugins/size';

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
    const $ = window.$;
    $.plot.plugins.push(size);
    $.plot($(domNode), config.data, config.options);
    done();
  },
});
