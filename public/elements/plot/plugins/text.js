import { get } from 'lodash';

/*
  FreeBSD-License
*/
const options = {
  numbers: {},
};

const xAlign = function (x) { return x; };
const yAlign = function (y) { return y; };
//const horizontalShift = 1;

function processOptions(/*plot, options*/) {
  // Nothing
}

function draw(plot, ctx) {
  $('.valueLabel', plot.getPlaceholder()).remove();
  $.each(plot.getData(), function (idx, series) {
    const show = get(series.numbers, 'show');
    if (!show) return;

    const points = series.data;
    const offset = plot.getPlotOffset();
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < points.length; i++) {

      const point = {
        'x': xAlign(points[i][0]),
        'y': yAlign(points[i][1]),
      };

      /*
      const axes = {
        0: 'x',
        1: 'y',
      };
      const horizontalShift = 1;
      const barNumber = i + horizontalShift;
      let text;
      if (series.stack != null) {
        const value = series.data[i / 3][horizontalShift]; // Why the / 3 here? What is this voodoo?
        point[axes[horizontalShift]] = (points[i][1] - value + yAlign(value));
        text = value;
      } else {
        text = points[i][1];
      }
      */


      function writeText(text, x, y) {
        if (typeof text === 'undefined') return;
        const textNode = $('<div/>')
          .text(String(text))
          .addClass('valueLabel')
          .css({
            position: 'absolute',
          });

        plot.getPlaceholder().append(textNode);

        textNode.css({
          left: x - (textNode.width() / 2),
          top: y - (textNode.height() / 2),
        });

      }

      const text = points[i][2].text;
      const c = plot.p2c(point);
      writeText(text, c.left + offset.left, c.top + offset.top + 1);
    }

    ctx.restore();
  });
}

function init(plot) {
  plot.hooks.processOptions.push(processOptions);
  plot.hooks.draw.push(draw);
}

export const text = {
  init: init,
  options: options,
  name: 'text',
  version: '0.1.0',
};
