import d3 from 'd3';
import attrs from 'plugins/tagcloud/vis/components/utils/attrs';
import baseLayout from 'plugins/tagcloud/vis/components/layout/layout';
import gGenerator from 'plugins/tagcloud/vis/components/elements/g';

function layoutGenerator() {
  var layout = baseLayout();
  var group = gGenerator();

  function generator(selection) {
    selection.each(function (data) {
      group.cssClass('chart')
        .transform(function (d) {
          return 'translate(' + d.dx + ',' + d.dy + ')';
        });

      d3.select(this)
        .datum(layout(data))
        .call(group);
    });
  }

  // Public API
  generator.attr = attrs(generator)(layout);

  return generator;
}

export default layoutGenerator;
