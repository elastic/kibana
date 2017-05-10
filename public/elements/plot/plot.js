import { Element } from '../element';
import './flot';

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
    config.options.colors = ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'];
    $.plot($(domNode), config.data, config.options);
    done();
  },
});
