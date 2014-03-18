k4.version = '0.0.0';

k4.namespace = function (ns_string) {
    'use strict';

    var parts = ns_string.split('.'),
        parent = k4,
        i;

    // strip redundant leading global
    if (parts[0] === 'k4') {
        parts = parts.slice(1);
    }

    for (i = 0; i < parts.length; i += 1) {
        // create a property if it doesn't exist
        if (typeof parent[parts[i]] === 'undefined') {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }

    return parent;
};

k4.mouseover = function (config) {
    'use strict';

    var selection = config.selection,
        data = config.data || data,
        xScale = config.xScale || xScale,
        yScale = config.yScale || yScale,
        width = config.width || innerWidth,
        height = config.height || innerHeight,
        focus = selection.append('g')
            .attr('class', 'focus')
            .style('display', 'none');
    
    var tip = d3.select('#tip');
    
    focus.append('circle')
        .attr('r', 4.5);

    focus.append('text')
        .attr('x', 9)
        .attr('dy', '.35em');

    focus.append('div')
        .attr('class', 'tooltip')
        .attr('x', 9)
        .attr('dy', '.35em');

    selection.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', function() {
            focus.style('display', null);
        })
        .on('mouseout', function() {
            focus.style('display', 'none');
        })
        .on('mousemove', mousemove);

    var tip = selection.append('rect')
        .attr('class', 'tooltip')
        .attr('width', 150)
        .attr('height', 50);


    function mousemove() {
        var x0 = xScale.invert(d3.mouse(this)[0]),
            bisectDate = d3.bisector(function(d) { return d[0]; }).left,
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            last = data.length - 1,
            d = last === data.indexOf(d0) ? d0 : x0 - d0[0] > d1[0] - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + xScale(d[0]) + "," + yScale(d[1]) + ")");
        focus.select('text').text(d[0] + ", " + d[1]);
        focus.select('div').attr('visibility', 'visible');


        //tip.attr('visibility', 'visible')
        console.log( 'mousemove', xScale(d[0]), yScale(d[1]) );
        tip.attr("x", function() {
            return xScale(d[0]);//+'px';
        })
        .attr("y", function() {
            return yScale(d[1]);//+'px';
        })
        .style("fill", "#333");


    }
};
