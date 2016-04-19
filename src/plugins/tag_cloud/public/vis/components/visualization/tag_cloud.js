import d3 from 'd3';
import _ from 'lodash';
import layoutCloud from 'plugins/tagcloud/vis/components/d3.layout.cloud/d3.layout.cloud';
import gGenerator from 'plugins/tagcloud/vis/components/elements/g';
import textElement from 'plugins/tagcloud/vis/components/elements/text';
import valuator from 'plugins/tagcloud/vis/components/utils/valuator';
import vislibComponentsSeedColorsProvider from 'ui/vislib/components/color/seed_colors';

function tagCloud() {
  var textScale = d3.scale.linear();
  var accessor = function (d) { return d; };
  var colorScale = d3.scale.ordinal().range(vislibComponentsSeedColorsProvider());
  var fontNormal = d3.functor('normal');
  var width = 250;
  var height = 250;
  var rotationScale = d3.scale.linear();
  var orientations = 1;
  var fromDegree = 0;
  var toDegree = 0;
  var font = d3.functor('serif');
  var fontSize = function (d) { return textScale(d.size); };
  var fontStyle = fontNormal;
  var fontWeight = fontNormal;
  var minFontSize = 12;
  var maxFontSize = 60;
  var timeInterval = Infinity;
  var spiral = 'archimedean';
  var padding = 1;
  var textAccessor = function (d) { return d.text; };
  var fill = function (d, i) { return colorScale(d.text); };
  var fillOpacity = d3.functor(1);
  var textAnchor = d3.functor('middle');
  var textClass = 'tag';

  function getSize(d) {
    return d.size;
  }

  function generator(selection) {
    selection.each(function (data, index) {
      var tags = accessor.call(this, data, index);

      var text = textElement()
        .cssClass(textClass)
        .fontSize(function (d) { return d.size + 'px'; })
        .fill(fill)
        .fillOpacity(fillOpacity)
        .textAnchor(textAnchor);

      var group = gGenerator()
        .cssClass('tags')
        .transform('translate(' + (width / 2) + ',' + (height / 2) + ')');

      var g = d3.select(this)
        .datum([data])
        .call(group);

      var numOfOrientations = orientations - 1;

      rotationScale
        .domain([0, numOfOrientations])
        .range([fromDegree, toDegree]);

      textScale
        .domain(d3.extent(tags, getSize))
        .range([minFontSize, maxFontSize]);

      function draw(tags) {
        g.select('g.' + group.cssClass())
          .datum(tags)
          .call(text);
      }

      layoutCloud()
        .size([width, height])
        .words(tags)
        .text(textAccessor)
        .rotate(function () {
          return rotationScale(~~(Math.random() * numOfOrientations));
        })
        .font(font)
        .fontStyle(fontStyle)
        .fontWeight(fontWeight)
        .fontSize(fontSize)
        .timeInterval(timeInterval)
        .spiral(spiral)
        .padding(padding)
        .on('end', draw)
        .start();
    });
  }

  // Public API
  generator.accessor = function (v) {
    if (!arguments.length) { return accessor; }
    accessor = valuator(v);
    return generator;
  };

  generator.width = function (v) {
    if (!arguments.length) { return width; }
    width = v;
    return generator;
  };

  generator.height = function (v) {
    if (!arguments.length) { return height; }
    height = v;
    return generator;
  };

  generator.orientations = function (v) {
    if (!arguments.length) { return orientations; }
    orientations = v;
    return generator;
  };

  generator.fromDegree = function (v) {
    if (!arguments.length) { return fromDegree; }
    fromDegree = v;
    return generator;
  };

  generator.toDegree = function (v) {
    if (!arguments.length) { return toDegree; }
    toDegree = v;
    return generator;
  };

  generator.font = function (v) {
    if (!arguments.length) { return font; }
    font = v;
    return generator;
  };

  generator.fontSize = function (v) {
    if (!arguments.length) { return fontSize; }
    fontSize = v;
    return generator;
  };

  generator.fontStyle = function (v) {
    if (!arguments.length) { return fontStyle; }
    fontStyle = v;
    return generator;
  };

  generator.fontWeight = function (v) {
    if (!arguments.length) { return fontWeight; }
    fontWeight = v;
    return generator;
  };

  generator.minFontSize = function (v) {
    if (!arguments.length) { return minFontSize; }
    minFontSize = v;
    return generator;
  };

  generator.maxFontSize = function (v) {
    if (!arguments.length) { return maxFontSize; }
    maxFontSize = v;
    return generator;
  };

  generator.timeInterval = function (v) {
    if (!arguments.length) { return timeInterval; }
    timeInterval = v;
    return generator;
  };

  generator.spiral = function (v) {
    if (!arguments.length) { return spiral; }
    spiral = v;
    return generator;
  };

  generator.padding = function (v) {
    if (!arguments.length) { return padding; }
    padding = v;
    return generator;
  };

  generator.text = function (v) {
    if (!arguments.length) { return textAccessor; }
    textAccessor = v;
    return generator;
  };

  generator.textScale = function (v) {
    var scales = ['linear', 'log', 'sqrt'];
    if (!arguments.length) { return textScale; }
    textScale = _.includes(scales, v) ? d3.scale[v]() : textScale;
    return generator;
  };

  generator.fill = function (v) {
    if (!arguments.length) { return fill; }
    fill = v;
    return generator;
  };

  generator.fillOpacity = function (v) {
    if (!arguments.length) { return fillOpacity; }
    fillOpacity = v;
    return generator;
  };

  generator.textAnchor = function (v) {
    if (!arguments.length) { return textAnchor; }
    textAnchor = v;
    return generator;
  };

  generator.textClass = function (v) {
    if (!arguments.length) { return textClass; }
    textClass = v;
    return generator;
  };

  return generator;
}

export default tagCloud;
