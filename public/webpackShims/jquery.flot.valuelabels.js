/* eslint-disable */

/**
 * Value Labels Plugin for flot.
 * https://github.com/winne27/flot-valuelabels
 * https://github.com/winne27/flot-valuelabels/wiki
 *
 * Implemented some new options (useDecimalComma, showMinValue, showMaxValue)
 * changed some default values: align now defaults to center, hideSame now defaults to false
 * by Werner Schäffer, October 2014
 *
 * Using canvas.fillText instead of divs, which is better for printing - by Leonardo Eloy, March 2010.
 * Tested with Flot 0.6 and JQuery 1.3.2.
 *
 * Original homepage: http://sites.google.com/site/petrsstuff/projects/flotvallab
 * Released under the MIT license by Petr Blahos, December 2009.
 */
(function($) {
    "use strict";

    var options = {
        series: {
            valueLabels: {
                show: false,
                showTextLabel: false,
                showMaxValue: false,
                showMinValue: false,
                showLastValue: false, // Use this to show the label only for the last value in the series
                labelFormatter: function(v) {
                    return v;
                },
                // Format the label value to what you want
                align: 'center', // can also be 'left' or 'right'
                valign: 'above', // can also be 'below', 'middle' or 'bottom'
                valignMin: 'below', // can also be 'above', 'middle' or 'bottom'
                valignMax: 'above', // can also be 'below', 'middle' or 'bottom'
                horizAlign: 'insideMax', // can also be 'outside', 'insideCenter' or 'insideZero'
                xoffset: 0,
                yoffset: 0,
                useDecimalComma: false,
                decimals: false,
                hideZero: false,
                hideSame: false, // Hide consecutive labels of the same value
                reverseAlignBelowZero: false, // reverse align and offset for values below 0
                showShadow: false, // false to not use canvas text shadow effect
                shadowColor: false, // false = use ctx default
                useBackground: false, // set label into box with background color
                backgroundColor: '#cccccc', // set backgroundColor like #FFCC00 or darkred
                fontcolor: '#222222', // set backgroundColor like #FFCC00 or darkred
                useBorder: false, // use a broder arround the label
                borderColor: '#999999'
            }
        }
    };

    function init(plot) {
        plot.hooks.draw.push(function(plot, ctx) {
            // keep a running total between series for stacked bars.
            var stacked = {};
            var t;

            var x;
            var xx;
            var x_bb;
            var x_pos;
            var xdelta;

            var y;
            var yy;
            var y_bb;
            var y_pos;
            var ydelta;

            var valignWork;
            var horizAlignWork;
            var notShowAll;
            var doWork;
            var val;
            var actAlign = 'left';
            var addstack;
            var height;
            var width;
            var bot;
            var compDelta;
            var textBaseline;
            var pointDelta;

            $.each(plot.getData(), function(ii, series) {
                if (!series.valueLabels.show) return;
                var showLastValue = series.valueLabels.showLastValue;
                var showMaxValue = series.valueLabels.showMaxValue;
                var showMinValue = series.valueLabels.showMinValue;
                var showTextLabel = series.valueLabels.showTextLabel;
                var labelFormatter = series.valueLabels.labelFormatter;
                var xoffset = series.valueLabels.xoffset;
                var yoffset = series.valueLabels.yoffset;
                var xoffsetMin = series.valueLabels.xoffsetMin || xoffset;
                var yoffsetMin = series.valueLabels.yoffsetMin || yoffset;
                var xoffsetMax = series.valueLabels.xoffsetMax || xoffset;
                var yoffsetMax = series.valueLabels.yoffsetMax || yoffset;
                var xoffsetLast = series.valueLabels.xoffsetLast || xoffset;
                var yoffsetLast = series.valueLabels.yoffsetLast || yoffset;
                var valign = series.valueLabels.valign;
                var valignLast = series.valueLabels.valignLast || valign;
                var valignMin = series.valueLabels.valignMin;
                var valignMax = series.valueLabels.valignMax;
                var align = series.valueLabels.align;
                var horizAlign = series.valueLabels.horizAlign;
                var horizAlignMin = series.valueLabels.horizAlignMin || horizAlign;
                var horizAlignMax = series.valueLabels.horizAlignMax || horizAlign;
                var horizAlignLast = series.valueLabels.horizAlignLast || horizAlign;
                var fontcolor = series.valueLabels.fontcolor || '#222222';
                var shadowColor = series.valueLabels.shadowColor;
                var font = series.valueLabels.font || series.xaxis.font || '9pt san-serif';
                var hideZero = series.valueLabels.hideZero;
                var hideSame = series.valueLabels.hideSame;
                var reverseAlignBelowZero = series.valueLabels.reverseAlignBelowZero;
                var showShadow = series.valueLabels.showShadow;
                var useDecimalComma = series.valueLabels.useDecimalComma;
                var stackedbar = series.stack;
                var decimals = series.valueLabels.decimals;
                var useBackground = series.valueLabels.useBackground;
                var backgroundColor = series.valueLabels.backgroundColor;
                var useBorder = series.valueLabels.useBorder;
                var borderColor = series.valueLabels.borderColor;

                // Workaround, since Flot doesn't set this value anymore
                series.seriesIndex = ii;

                var last_val = null;
                var last_x = -1000;
                var last_y = -1000;
                var xCategories = series.xaxis.options.mode == 'categories';
                var yCategories = series.yaxis.options.mode == 'categories';

                pointDelta = (series.points.show) ? series.points.radius - series.points.lineWidth / 2 : 0;

                if ((showMinValue || showMaxValue) && typeof(series.data[0]) != 'undefined') {
                    series.data[0][0] = +series.data[0][0];
                    series.data[0][1] = +series.data[0][1];
                    var xMin = +series.data[0][0];
                    var xMax = +series.data[0][0];
                    var yMin = +series.data[0][1];
                    var yMax = +series.data[0][1];
                    for (var i = 1; i < series.data.length; ++i) {
                        series.data[i][0] = +series.data[i][0];
                        series.data[i][1] = +series.data[i][1];
                        if (+series.data[i][0] < xMin) xMin = +series.data[i][0];
                        if (+series.data[i][0] > xMax) xMax = +series.data[i][0];
                        if (+series.data[i][1] < yMin) yMin = +series.data[i][1];
                        if (+series.data[i][1] > yMax) yMax = +series.data[i][1];
                    }
                } else {
                    showMinValue = false;
                    showMaxValue = false;
                    for (var i = 0; i < series.data.length; ++i) {
                        series.data[i][0] = +series.data[i][0];
                        series.data[i][1] = +series.data[i][1];
                    }
                }

                notShowAll = showMinValue || showMaxValue || showLastValue;
                for (var i = 0; i < series.data.length; ++i) {
                    if (series.data[i] === null) continue;
                    x = series.data[i][0],
                    y = series.data[i][1];

                    if (showTextLabel && series.data[i].length > 2) {
                        t = series.data[i][2];
                    } else {
                        t = false;
                    }

                    if (notShowAll) {
                        doWork = false;
                        if (showMinValue && yMin == y && !series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetMin;
                            ydelta = yoffsetMin;
                            valignWork = valignMin;
                            showMinValue = false;
                        }
                        else if (showMinValue && xMin == x && series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetMin;
                            ydelta = yoffsetMin;
                            horizAlignWork = horizAlignMin;
                            showMinValue = false;
                        } else if (showMaxValue && yMax == y && !series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetMax;
                            ydelta = yoffsetMax;
                            valignWork = valignMax;
                            showMaxValue = false;
                        } else if (showMaxValue && xMax == x && series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetMax;
                            ydelta = yoffsetMax;
                            horizAlignWork = horizAlignMax;
                            showMaxValue = false;
                        } else if (showLastValue && i == series.data.length - 1 && !series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetLast;
                            ydelta = yoffsetLast;
                            valignWork = valignLast;
                        } else if (showLastValue && i == series.data.length - 1 && series.bars.horizontal) {
                            doWork = true;
                            xdelta = xoffsetLast;
                            ydelta = yoffsetLast;
                            horizAlignWork = horizAlignLast;
                        }
                        if (!doWork) continue;
                    } else if (reverseAlignBelowZero && y < 0 && !series.bars.horizontal) {
                        xdelta = xoffset;
                        ydelta = -1 * yoffset;
                        if (valign == 'above') {
                            valign = 'below';
                        } else if (valign == 'below') {
                            valign = 'above';
                        }
                        valignWork = valign;
                    } else {
                        xdelta = xoffset;
                        ydelta = yoffset;
                        valignWork = valign;
                        horizAlignWork = horizAlign;
                    }

                    // for backward compability
                    if (valignWork == 'top') {
                        valignWork = 'above';
                    }

                    if (xCategories) {
                        x = series.xaxis.categories[x];
                    }
                    if (yCategories) {
                        y = series.yaxis.categories[y];
                    }

                    if (x < series.xaxis.min || x > series.xaxis.max || y < series.yaxis.min || y > series.yaxis.max) continue;

                    if (t !== false) {
                        val = t;
                    } else {
                        val = (series.bars.horizontal) ? x : y;
                        if (val == null) {
                            val = ''
                        }

                        if (val === 0 && (hideZero || stackedbar)) continue;

                        if (decimals !== false) {
                            val = parseFloat(val).toFixed(decimals);
                        }
                    }

                    if (series.valueLabels.valueLabelFunc) {
                        val = series.valueLabels.valueLabelFunc({
                            series: series,
                            seriesIndex: ii,
                            index: i
                        });
                    }
                    val = "" + val;
                    val = labelFormatter(val);

                    if (!hideSame || val != last_val || i == series.data.length - 1) {
                        // if bar is too small to show value inside, show it outside
                        if (series.bars.horizontal) {
                            ctx.font = font;
                            compDelta = (useBorder || useBackground) ? 10 : 6;
                            if (Math.abs(series.xaxis.p2c(x) - series.xaxis.p2c(0)) < ctx.measureText(val).width + Math.abs(xdelta) + compDelta) {
                                if (horizAlignWork != 'outside') {
                                    xdelta = -1 * xdelta;
                                    horizAlignWork = 'outside';
                                }
                            }
                        }

                        if (useDecimalComma) {
                            val = val.toString().replace('.', ',');
                        }

                        // add up y axis for stacked series
                        addstack = 0;
                        if (stackedbar) {
                            if (!stacked[x]) stacked[x] = 0.0;
                            addstack = stacked[x];
                            stacked[x] = stacked[x] + y;
                        }

                        xx = series.xaxis.p2c(x) + plot.getPlotOffset().left;
                        yy = series.yaxis.p2c(y + addstack) + plot.getPlotOffset().top;

                        if (!hideSame || Math.abs(yy - last_y) > 20 || last_x < xx) {
                            last_val = val;
                            last_x = xx + val.length * 8;
                            last_y = yy;
                            if (series.bars.horizontal) {
                                y_pos = yy;
                                textBaseline = 'middle';
                                if (x >= 0) {
                                    if (horizAlignWork == 'outside') {
                                        actAlign = 'left';
                                        xdelta = xdelta + 4;
                                    } else if (horizAlignWork == 'insideMax') {
                                        actAlign = 'right';
                                        xdelta = xdelta - 4;
                                    } else if (horizAlignWork == 'insideCenter') {
                                        actAlign = 'center';
                                        xx = plot.getPlotOffset().left + series.xaxis.p2c(0) + (series.xaxis.p2c(x) - series.xaxis.p2c(0)) / 2 + xdelta;
                                    } else if (horizAlignWork == 'insideZero') {
                                        actAlign = 'left';
                                        xx = plot.getPlotOffset().left + series.xaxis.p2c(0) + 3 + xdelta;
                                    }
                                } else {
                                    if (horizAlignWork == 'outside') {
                                        actAlign = 'right';
                                        xdelta = xdelta - 4;
                                    } else if (horizAlignWork == 'insideMax') {
                                        actAlign = 'left';
                                        xdelta = xdelta + 4;
                                    } else if (horizAlignWork == 'insideCenter') {
                                        actAlign = 'center';
                                        xx = plot.getPlotOffset().left + series.xaxis.p2c(0) + (series.xaxis.p2c(x) - series.xaxis.p2c(0)) / 2 + xdelta;
                                    } else if (horizAlignWork == 'insideZero') {
                                        actAlign = 'right';
                                        xx = plot.getPlotOffset().left + series.xaxis.p2c(0) - 4 + xdelta;
                                    }
                                }
                                x_pos = xx + xdelta;
                            } else {
                                if (valignWork == 'bottom') {
                                    textBaseline = 'bottom';
                                    yy = plot.getPlotOffset().top + plot.height();
                                } else if (valignWork == 'middle') {
                                    textBaseline = 'middle';
                                    bot = plot.getPlotOffset().top + plot.height();
                                    yy = (bot + yy) / 2;
                                } else if (valignWork == 'below') {
                                    textBaseline = 'top';
                                    ydelta = ydelta + 4 + pointDelta;
                                } else if (valignWork == 'above') {
                                    textBaseline = 'bottom';
                                    ydelta = ydelta - 2 - pointDelta;
                                }

                                x_pos = xx + xdelta;
                                y_pos = yy + ydelta;
                                // If the value is on the top of the canvas, we need
                                // to push it down a little
                                if (yy <= 0) y_pos = y_pos + 16;
                                // The same happens with the x axis
                                if (xx >= plot.width() + plot.getPlotOffset().left) {
                                    x_pos = plot.width() + plot.getPlotOffset().left + xdelta - 3;
                                    actAlign = 'right';
                                } else {
                                    actAlign = align;
                                }
                            }
                            ctx.font = font;

                            if (useBorder || useBackground) {
                                width = ctx.measureText(val).width + 5;
                                if (width % 2 == 1) {
                                    width++;
                                }
                                height = parseInt(font, 10) + 7;
                                if (textBaseline == 'top') {
                                    y_bb = y_pos;
                                    y_pos = y_pos + 3;
                                } else if (textBaseline == 'bottom') {
                                    y_bb = y_pos - height - 2;
                                    y_pos = y_pos - 2;
                                } else if (textBaseline == 'middle') {
                                    y_bb = y_pos - (height + 1) / 2;
                                    y_pos = y_pos + 1;
                                }

                                if (actAlign == 'right') {
                                    x_bb = x_pos - width + 1;
                                    x_pos = x_pos - 2;
                                } else if (actAlign == 'left') {
                                    x_bb = x_pos;
                                    x_pos = x_pos + 3;
                                } else {
                                    x_bb = x_pos - width / 2;
                                }

                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;
                                ctx.shadowBlur = 0;
                                if (useBorder) {
                                    ctx.strokeStyle = borderColor;
                                    ctx.strokeRect(x_bb, y_bb, width, height);
                                }
                                if (useBackground) {
                                    ctx.fillStyle = backgroundColor;
                                    ctx.fillRect(x_bb, y_bb, width, height);
                                }
                            }

                            ctx.fillStyle = fontcolor;

                            if (showShadow) {
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;
                                ctx.shadowBlur = 1.5;
                                ctx.shadowColor = shadowColor;
                            } else {
                                ctx.shadowBlur = 0;
                            }

                            ctx.textAlign = actAlign;
                            ctx.textBaseline = textBaseline;
                            ctx.fillText(val, x_pos, y_pos);
                        }
                    }
                }
            });
        });
    }
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'valueLabels',
        version: '2.0.0'
    });
})(jQuery);
