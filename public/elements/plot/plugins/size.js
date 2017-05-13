/* eslint-disable */
/*
 * The MIT License
Copyright (c) 2010, 2011, 2012, 2013 by Juergen Marsch
Copyright (c) 2015 by Alexander Wunschik
Copyright (c) 2015 by Stefan Siegl
Copyright (c) 2015 by Pascal Vervest
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

const pluginName = 'bubbles';
const pluginVersion = '0.4.2';

const options = {
  series: {
    bubbles: {
      active: true,
      show: true,
      fill: true,
      lineWidth: 2,
      highlight: {
        opacity: 0.5,
        show: false,
      },
      drawbubble: drawbubbleDefault,
      bubblelabel: {
        show: false,
        fillStyle: 'black',
      },
      findMode: 'nearest',
    },
  },
};

const defaultOptions = {
  series: {
    editMode: 'xy', //could be "none", "x", "y", "xy", "v"
    nearBy: {
      distance: 6,
      findMode: 'circle',
    },
  },
};

function drawbubbleDefault(ctx, serie, x, y, v, r, c) {
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineWidth = serie.bubbles.lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, true);
  ctx.closePath();
  if (serie.bubbles.fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  if (serie.bubbles.bubblelabel.show) {
    drawbubbleLabel(ctx, serie, x, y, v);
  }
  // based on a patch from Nikola Milikic
  function drawbubbleLabel(ctx, serie, x, y, v) {
    ctx.fillStyle = serie.bubbles.bubblelabel.fillStyle;
    const vsize = ctx.measureText(v);
    const xtext = x - vsize.width / 2;
    const ytext = y + 4;
    ctx.fillText(v, xtext, ytext);
  }
}

function extendEmpty(org, ext) {
  for (const i in ext) {
    if (!org[i]) {
      org[i] = ext[i];
    } else {
      if (typeof ext[i] === 'object') {
        extendEmpty(org[i], ext[i]);
      }
    }
  }
}

function init(plot) {
  var offset = null;
  var series = null;
  var eventHolder = null;
  var highlights = [];

  plot.hooks.processOptions.push(processOptions);
  plot.hooks.bindEvents.push(bindEvents);
  plot.hooks.shutdown.push(unbindEvents);
  plot.hooks.drawOverlay.push(drawOverlay);

  function processOptions(plot, options) {
    if (options.series.bubbles.active) {
      extendEmpty(options, defaultOptions);
      plot.hooks.drawSeries.push(drawSeries);
    }
  }

  function bindEvents(plot, eHolder) {
    eventHolder = eHolder;
    var options = plot.getOptions();
    if (options.series.bubbles.show && options.grid.hoverable) {
      eventHolder.bind('mousemove', onMouseMove);
    }

    if (options.series.bubbles.show && options.grid.clickable) {
      eventHolder.bind('click', onClick);
    }
  }

  function unbindEvents(plot, eventHolder){
    eventHolder.unbind("mousemove", onMouseMove);
    eventHolder.unbind("click", onClick);
  }

  function onMouseMove(event) {
    triggerEvent("plothover", event, function(s) {
      return s["hoverable"] != false;
    });
  }

  function onClick(event) {
    triggerEvent("plotclick", event, function(s) {
      return s["clickable"] != false;
    });
  }

  function triggerEvent(eventname, event, seriesFilter) {
    var offset = eventHolder.offset();
    var canvasX = event.pageX - offset.left - plot.getPlotOffset().left;
    var canvasY = event.pageY - offset.top - plot.getPlotOffset().top;
    var pos = plot.c2p({
      left: canvasX,
      top: canvasY
    });
    var item = findNearbyItem(canvasX, canvasY, seriesFilter);

    pos.pageX = event.pageX;
    pos.pageY = event.pageY;

    if (item) {
      highlight(item.series, item.datapoint);
      item.pageX = parseInt(item.series.xaxis.p2c(item.datapoint[0]) + offset.left + plot.getPlotOffset().left);
      item.pageY = parseInt(item.series.yaxis.p2c(item.datapoint[1]) + offset.top + plot.getPlotOffset().top);
    } else {
      unhighlight(null, null);
    }

    plot.getPlaceholder().trigger(eventname, [pos, item]);
  };

  function findNearbyItem(mouseX, mouseY, seriesFilter) {
    var item = null;
    var iSeries;
    var iPoints;

    var series = plot.getData();
    for (iSeries = series.length - 1; iSeries >= 0; --iSeries) {
      if (!seriesFilter(series[iSeries])) {
        continue;
      }

      var s = series[iSeries];
      var axisx = s.xaxis;
      var axisy = s.yaxis;
      var points = s.datapoints.points;
      var pointsize = s.datapoints.pointsize;
      var mx = axisx.c2p(mouseX);
      var my = axisy.c2p(mouseY);

      if (s.bubbles.show) {
        for (iPoints = 0; iPoints < points.length; iPoints += pointsize) {
          var x = points[iPoints];
          var y = points[iPoints + 1];
          if (typeof x != 'number' || typeof y != 'number') {
            continue;
          }

          var newmaxDistance = radiusAtPoint(s, [x, y]) || 0;
          var newSmallDist = newmaxDistance * newmaxDistance + 1;
          var maxx = newmaxDistance / axisx.scale;
          var maxy = newmaxDistance / axisy.scale;

          if (x - mx > maxx || x - mx < -maxx ||
            y - my > maxy || y - my < -maxy) {
            continue;
          }

          var dx = Math.abs(axisx.p2c(x) - mouseX);
          var dy = Math.abs(axisy.p2c(y) - mouseY);
          var dist = dx * dx + dy * dy;

          if (dist < newSmallDist) {
            newSmallDist = dist;
            item = [iSeries, iPoints / pointsize];
          }
        }
      }

      if (s.bubbles.findMode === 'first' && item) {
        break;
      }

    }

    if (item) {
      iSeries = item[0];
      iPoints = item[1];
      var pointsize = series[iSeries].datapoints.pointsize;

      return {
        datapoint: series[iSeries].datapoints.points.slice(iPoints * pointsize, (iPoints + 1) * pointsize),
        dataIndex: iPoints,
        series: series[iSeries],
        seriesIndex: iSeries
      };
    }

    return null;
  };

  function radiusAtPoint(series, point) {
    var points = series.datapoints.points;
    var pointsize = series.datapoints.pointsize;

    for (var iPoints = points.length; iPoints > 1; iPoints -= pointsize) {
      var x = points[iPoints - 2];
      var y = points[iPoints - 1];
      if (point[0] == x && point[1] == y) {
        var radius_index = (iPoints - 2) / pointsize;
        return parseInt(series.yaxis.scale * series.data[radius_index][2] / 2, 0);
      }
    }
    return 0;
  };

  function drawSeries(plot, ctx, series) {
    if (series.bubbles.show) {
      offset = plot.getPlotOffset();
      for (var iPoints = 0; iPoints < series.data.length; iPoints++) {
        drawbubble(ctx, series, series.data[iPoints], series.color);
      }
    }
  };

  function drawbubble(ctx, series, data, c, overlay) {
    var x = offset.left + series.xaxis.p2c(data[0]);
    var y = offset.top + series.yaxis.p2c(data[1]);
    var v = data[2];
    var r = parseInt(series.yaxis.scale * data[2] / 2, 0);
    if (typeof c === 'function') {
      c = c.apply(this, data);
    }
    series.bubbles.drawbubble(ctx, series, x, y, v, r, c, overlay);
  }

  function drawOverlay(plot, octx) {

    var data = plot.getOptions();

    // only render highlights if enabled
    if (data.series.bubbles.highlight.show === true) {
      var i, hi;
      for (i = 0; i < highlights.length; ++i) {
        hi = highlights[i];
        drawBubbleOverlay(hi.series, hi.point, octx);
      }
    }
  }

  function drawBubbleOverlay(series, point, octx) {

    var x = point[0], y = point[1],
      axisx = series.xaxis, axisy = series.yaxis,
      highlightOpacity = series.bubbles.highlight.opacity;

    if (x < axisx.min || x > axisx.max || y < axisy.min || y > axisy.max) {
      return;
    }

    octx.lineWidth = 1;
    octx.strokeStyle = `rgba(0, 0, 0, ${highlightOpacity})`;
    octx.fillStyle = `rgba(0, 0, 0, ${highlightOpacity})`;

    const radius = radiusAtPoint(series, point);

    x = offset.left + axisx.p2c(x);
    y = offset.top + axisy.p2c(y);

    octx.beginPath();
    octx.arc(x, y, radius, 0, 2 * Math.PI, false);
    octx.closePath();
    octx.fill();
    octx.stroke();
  }

  function highlight(s, point, auto) {
    highlights = [];
    plot.triggerRedrawOverlay();

    if (typeof s === 'number') {
      s = series[s];
    }

    if (typeof point === 'number') {
      const ps = s.datapoints.pointsize;
      point = s.datapoints.points.slice(ps * point, ps * (point + 1));
    }

    const i = indexOfHighlight(s, point);
    if (i === -1) {
      highlights.push({ series: s, point: point, auto: auto });

      plot.triggerRedrawOverlay();
    }
  }

  function unhighlight(s, point) {
    if (s == null && point == null) {
      highlights = [];
      plot.triggerRedrawOverlay();
      return;
    }

    if (typeof s === 'number') {
      s = series[s];
    }

    if (typeof point === 'number') {
      const ps = s.datapoints.pointsize;
      point = s.datapoints.points.slice(ps * point, ps * (point + 1));
    }

    const i = indexOfHighlight(s, point);
    if (i !== -1) {
      highlights.splice(i, 1);

      plot.triggerRedrawOverlay();
    }
  }

  function indexOfHighlight(s, p) {
    for (let i = 0; i < highlights.length; ++i) {
      const h = highlights[i];
      if (h.series === s && h.point[0] === p[0]
        && h.point[1] === p[1]) {
        return i;
      }
    }
    return -1;
  }

}

export const size = {
  init: init,
  options: options,
  name: pluginName,
  version: pluginVersion
};
