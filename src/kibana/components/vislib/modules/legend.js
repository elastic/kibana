define(function(require) {
    'use strict';

    var d3 = require('lib/d3/d3');

    function legend (elem, colors, chart) {

        var vis = d3.select(elem),
            chartWrap = vis.select('.chartwrapper'),
            legendWrap = vis.append('div').attr('class', 'legendwrapper'),
            allLayers = chartWrap.selectAll('rect'),
            header = legendWrap.append('div').attr('class', 'header'),
            list,
            itm,
            allItms;

        header
            .append('div')
            .attr('class', 'column-labels')
            .html('<span class="btn btn-xs btn-default legend-toggle"><i class="fa fa-list-ul"></i></span>;');

        list = legendWrap.append('ul')
            .attr('class', 'legend-ul')
            .selectAll('li')
            .data(d3.keys(colors))
            .enter().append('li')
            .attr('class', function (d) {
                var label = d !== undefined ?
                    d.replace(/[.]+|[/]+|[\s]+|[#]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '') : undefined;

                return 'legends rl rl-' + label;
            })
            .html(function(d) {
                var str = '<span class="dots" style="background:' + colors[d] + '"></span>' + d + '';

                return str;
            });

        allItms = vis.selectAll('li.legends').style('cursor', 'pointer');

        list
            .on('mouseover', function (d) {
                // chart layer
                // Regex to remove ., /, white space, *, ;, (, ), :, , from labels.
                var label = d !== undefined ?
                    d.replace(/[.]+|[/]+|[\s]+|[#]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '') : undefined,
                    layerClass = '.rl-' + label;

                allLayers  = vis.selectAll('.rl').style('opacity', 0.3);

                vis.selectAll(layerClass).style('opacity', 1);

                // legend list
                allItms.style('opacity', 0.3);
                itm = d3.select(this).style('opacity', 1);
            })
            .on('mouseout', function () {
                allLayers  = vis.selectAll('.rl').style('opacity', 1);
                allItms.style('opacity', 1);
            });

        // toggle header
        function closeheader(e) {
            var vwidth = vis.style('width'),
                legwidth = +vwidth.substr(0,vwidth.length-2);

            chartWrap.style('width', function() {
                return legwidth - 30 + 'px';
            });

            legendWrap
                .classed('legend-open', false)
                .style('width', '30px')
                .style('height', '30px');

            header
                .select('.column-labels')
                .html('<span class="btn btn-xs btn-default legend-toggle"><i class="fa fa-list-ul"></i></span>&nbsp;');

            header
                .select('.legend-toggle')
                .on( 'click', function (e) {
                    var sel = d3.select(this)[0].parentNode;
                    toggleheader(e);
                });
        }

        function openheader(e) {
            var vheight = vis.style('height'),
                vwidth = vis.style('width'),
                legheight = +vheight.substr(0,vheight.length-2) - 68,
                legwidth = +vwidth.substr(0,vwidth.length-2);

            chartWrap.style('width', function() {
                return legwidth - 180 + 'px';
            });

            legendWrap
                .classed('legend-open', true)
                .style('width', '170px')
                .style('height', legheight + 'px');

            header
                .select('.column-labels')
                .html('<span class="btn btn-xs legend-toggle btn-primary"><i class="fa fa-list-ul"></i></span>');

            header
                .select('.legend-toggle')
                .on( 'click', function (e) {
                    var sel = d3.select(this)[0].parentNode;
                    toggleheader(e);
                });
        }

        function toggleheader (e) {
            if (chart.headerOpen === undefined || chart.headerOpen === false) {
                chart.headerOpen = true;
                openheader(e);
            } else {
                chart.headerOpen = false;
                closeheader(e);
            }

            chart.resize();
        }

        // check for last state
        if ( chart.headerOpen === true ) { openheader(); }
        else { closeheader(); }
    }

    return function (elem, colors, chart) {
        return legend (elem, colors, chart);
    };
});