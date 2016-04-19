var d3 = require('d3');
var numeral = require('numeral');
var gGenerator = require('plugins/heatmap/vis/components/elements/g');
var rectGenerator = require('plugins/heatmap/vis/components/elements/rect');
var textGenerator = require('plugins/heatmap/vis/components/elements/text');

function legend() {
  var cssClass = 'legend';
  var transform = 'translate(0,0)';
  var rectWidth = 20;
  var rectHeight = 20;
  var fill = function (d) { return d.color; };
  var fillOpacity = 1;
  var stroke = '#ffffff';
  var strokeWidth = 1;
  var strokeOpacity = 1;
  var textPadding = 5;
  var textAnchor = 'start';
  var textFill = '#848e96';
  var title = 'Legend';
  var numberFormat = '0a';
  var scale = d3.scale.quantize();
  var g = gGenerator();
  var block = gGenerator();
  var legendGBlock = gGenerator();
  var legendTitle = textGenerator();
  var rect = rectGenerator();
  var svgText = textGenerator();

  function formatNumber(num, format) {
    return numeral(num).format(format);
  }

  function generator(selection) {
    selection.each(function (datum) {
      g.cssClass(cssClass).transform(transform);

      legendGBlock.cssClass('legend-title').transform(transform);
      legendTitle.x(0).y(-10).dx('').dy('.32em').fill(textFill)
        .anchor('start')
        .text(title);

      // Add Legend title
      d3.select(this)
        .datum([[datum]])
        .call(legendGBlock)
        .selectAll('g.legend-title')
        .call(legendTitle);

      // Adds g elements
      d3.select(this)
        .datum([datum])
        .call(g)
        .selectAll('g.' + cssClass)
        .each(function (data) {
          var upperLimit = data.pop();

          block.cssClass('block')
            .transform(function (d, i) {
              return 'translate(0,' + (rectHeight * i) + ')';
            });

          // Adds rects and text
          d3.select(this)
            .datum(data)
            .call(block)
            .selectAll('g.block')
            .each(function (d, i) {
              rect
                .class('legend-cell')
                .x(0)
                .y(0)
                .rx(0)
                .ry(0)
                .width(rectWidth)
                .height(rectHeight)
                .fill(function (d, i) { return scale(d); })
                .fillOpacity(fillOpacity)
                .stroke(stroke)
                .strokeWidth(strokeWidth)
                .strokeOpacity(strokeOpacity);

              svgText
                .class('legend-text')
                .x(function () { return rectWidth + textPadding; })
                .y(function () { return rectHeight / 2; })
                .dx('')
                .dy('.32em')
                .fill(textFill)
                .anchor(textAnchor)
                .text(function () {
                  var formattedNumber = formatNumber(Math.round(d), numberFormat);

                  if (i === data.length - 1) {
                    return formattedNumber + ' - ' + formatNumber(Math.round(upperLimit), numberFormat);
                  }
                  return formattedNumber + ' - ' + formatNumber(Math.round(data[i + 1]), numberFormat);
                });

              d3.select(this)
                .datum([d])
                .call(rect)
                .call(svgText);
            });
        });
    });
  }

  // Public API
  generator.class = function (v) {
    if (!arguments.length) { return cssClass; }
    cssClass = v;
    return generator;
  };

  generator.transform = function (v) {
    if (!arguments.length) { return transform; }
    transform = v;
    return generator;
  };

  generator.rectWidth = function (v) {
    if (!arguments.length) { return rectWidth; }
    rectWidth = v;
    return generator;
  };

  generator.rectHeight = function (v) {
    if (!arguments.length) { return rectHeight; }
    rectHeight = v;
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

  generator.stroke = function (v) {
    if (!arguments.length) { return stroke; }
    stroke = v;
    return generator;
  };

  generator.strokeWidth = function (v) {
    if (!arguments.length) { return strokeWidth; }
    strokeWidth = v;
    return generator;
  };

  generator.strokeOpacity = function (v) {
    if (!arguments.length) { return strokeOpacity; }
    strokeOpacity = v;
    return generator;
  };

  generator.text = function (v) {
    if (!arguments.length) { return text; }
    text = v;
    return generator;
  };

  generator.textPadding = function (v) {
    if (!arguments.length) { return textPadding; }
    textPadding = v;
    return generator;
  };

  generator.textAnchor = function (v) {
    if (!arguments.length) { return textAnchor; }
    textAnchor = v;
    return generator;
  };

  generator.textFill = function (v) {
    if (!arguments.length) { return textFill; }
    textFill = v;
    return generator;
  };

  generator.title = function (v) {
    if (!arguments.length) { return title; }
    title = v;
    return generator;
  };

  generator.numberFormat = function (v) {
    var formats = {
      number: '0a',
      currency: '($0a)',
      bytes: '0b',
      percentage: '0%'
    };

    if (!arguments.length) { return numberFormat; }
    numberFormat = formats[v] ? formats[v] : formats.number;
    return generator;
  };

  generator.scale = function (v) {
    if (!arguments.length) { return scale; }
    scale = v;
    return generator;
  };

  return generator;
}

module.exports = legend;
