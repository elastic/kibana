import { Element } from '../element';
import $ from 'jquery';

module.exports = new Element({
  name: 'line',
  displayName: 'Line Chart',
  icon: null,
  schema: {
    datasource: true,
    model: 'pointseries'
  },
  destroy(plot) {
    //plot.destroy();
    console.log(plot);
  },
  render(domNode, data, done) {
    $(domNode).text(JSON.stringify(data, null, ' '));
    done();
  }
});
