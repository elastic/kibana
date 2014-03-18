
k4.map = function() {
    'use strict';

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 600,
        height = 600,
        scale = 245,
        shading = false,
        labels = true,
        watercolor = "#ddd",
        countrycolor = "#ddd",
        pointcolor = "#ddd",
        rotate = [52.8, -49.6],
        colorScale = d3.scale.quantile();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom;

            var svg = d3.select(this).selectAll('svg').data([0]);
            svg.enter().append('svg').attr('width', width)
                .attr('height', height);
            
            // map vars
            var colors = ['#ffebbc','#f8d294','#f2b96e','#ed9d4c','#e97f2e','#e55c13','#e02c00'];
            var colorScale = d3.scale.quantile()
                .domain([ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 ])
                .range(colors);

            // projection
            var projection = d3.geo.orthographic()
                .scale(scale)
                .translate([width/2, height/2])
                .precision(0.1)
                .rotate(rotate)
                .clipAngle(90)
                .clipExtent([[1, 1], [width - 1, height - 1]]);
                
            // scales for fading/sizing labels/points
            var opacityScale = d3.scale.linear()
                .domain([200, 150])
                .range([1,0]);

            var ptSizeScale = d3.scale.linear()
                .domain([500, 150])
                .range([12,7]);

            var path = d3.geo.path().projection(projection).pointRadius(2);

            var graticule = d3.geo.graticule();

            // map data
            var land = data[0];
            var countries = data[1];
            var places = data[2];
            
            //var win = d3.select(window)
            //    .on('mousemove', mouseMove)
            //    .on('mouseup', mouseUp);

            svg.on('mousemove', mouseMove)
                .on('mouseup', mouseUp)
                .on('mousedown', mouseDown)
                .call(d3.behavior.zoom()
                    .translate(projection.translate())
                    .scale(projection.scale())
                    .scaleExtent([50,500])
                    .on('zoom', function() {
                        reZoom();
                    })
                );

            // shading def
            var globe_shading = svg.append("defs")
                .append("radialGradient")
                .attr("id", "globe_shading")
                .attr("cx", "50%")
                .attr("cy", "40%");
            globe_shading.append("stop")
                .attr("offset","50%")
                .attr("stop-color", "#fff")
                .attr("stop-opacity","0.2");
            globe_shading.append("stop")
                .attr("offset","100%")
                .attr("stop-color", "#253d56")
                .attr("stop-opacity","0.4");

            // water sphere
            svg.append("path")
                .datum({type: "Sphere"})
                .attr("class", "water noclick")
                .style('fill', watercolor)
                .attr("d", path);

            // graticule
            svg.append('path')
                .datum(graticule)
                .attr('class', 'graticule noclick')
                .attr('d', path);

            // land shape
            svg.append('path')
                .datum(land)
                .attr('class', 'land noclick')
                .attr('d', path);

            // shading sphere - optional
            if (shading) {
                svg.append('path')
                    .datum({type: 'Sphere'})
                    .attr('class','noclick')
                    .style('fill', 'url(#globe_shading)');
            }
                
            // country shapes    
            svg.append('g')
                .attr('class', 'countries')
                .selectAll('path')
                .data(countries)
                .enter().append('path')
                .attr('class', 'countries')
                .attr('d', path)
                .style('fill', countrycolor)
                .on('mouseover', function(d) {
                    console.log('country id: ' + d.id);
                });

            // edge sphere
            svg.append('path')
                .datum({type: 'Sphere'})
                .attr('class', 'edge noclick')
                .attr('d', path);
            
            // place points
            svg.append('g').attr('class','points noclick')
                .selectAll('text')
                .data(places)
                .enter().append('path')
                .attr('class', 'point')
                .style('fill', pointcolor)
                .attr('d', path);

            // place labels
            svg.append('g').attr('class','labels noclick')
                .selectAll('text')
                .data(places)
                .enter().append('text')
                .attr('class', 'label')
                .text(function(d) { 
                    return d.properties.name;
                });

            reDraw();

            // 
            function positionLabels() {

                var centerPos = projection.invert([width/2,height/2]);
                var arc = d3.geo.greatArc();
                var s = projection.scale();
                
                // labels
                svg.selectAll('.label')
                    .attr('text-anchor',function(d) {
                        var x = projection(d.geometry.coordinates)[0];
                        if (x < (width/2) - 20) {
                            return 'end'; 
                        } else if (x < (width/2) + 20) {
                            return 'middle';
                        } else {
                            return 'start';
                        }
                    })
                    .attr('transform', function(d) {
                        var loc = projection(d.geometry.coordinates),
                        x = loc[0],
                        y = loc[1],
                        xoffset = 6,
                        yoffset = -3;
                        if (x < width/2) {
                            xoffset = -6;
                        }
                        if (x < (width/2) - 20) {
                            yoffset = -1;
                        } else if (x < (width/2) + 20) {
                            yoffset = -6;
                        } else {
                            yoffset = -1;
                        }
                        return 'translate(' + (x + xoffset) + ',' + (y + yoffset) + ')';
                })
                .style('opacity', function() {
                    return opacityScale(s);
                })
                .style('font-size', function() {
                    return ptSizeScale(s);
                })
                .style('display',function(d) {
                    var dist = arc.distance({source: d.geometry.coordinates, target: centerPos});
                    if (dist > 1.57) {
                        return 'none';
                    } else {
                        return 'inline';
                    }
                });

                // points
                svg.selectAll('.point')
                .style('opacity', function() {
                    return opacityScale(s);
                });
                
            }

            function reDraw() {
                svg.selectAll('path').attr('d', path);
                positionLabels();
                console.log('Map center: ', -projection.rotate()[1], -projection.rotate()[0]);
            }

            function reZoom() {
                if (d3.event) { projection.scale(d3.event.scale); }
                svg.selectAll('*')
                .attr('d', path);
                positionLabels();
                console.log('Map scale: ', d3.event.scale);
            }

            // window mousemove
            function mouseMove() {
                if (m0) {
                    // limit vertical rotation between 55 & -55
                    var m1 = [d3.event.pageX, d3.event.pageY],
                    o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
                    if (o1[1] > 55) {
                        o1[1] = 55;
                    }
                    if (o1[1] < -55) {
                        o1[1] = -55;
                    }
                    projection.rotate(o1);
                    reDraw();
                }
            }

            // window mouseup
            function mouseUp() {
                if (m0) {
                    mouseMove();
                    m0 = null;
                }
            }

            // svg mousedown
            var m0, o0;
            function mouseDown() {
                m0 = [d3.event.pageX, d3.event.pageY];
                o0 = projection.rotate();
                d3.event.preventDefault();
            }

        });
    }

    chart.margin = function(_) {
        if (!arguments.length) { return margin; }
        margin.top = typeof _.top !== 'undefined' ? _.top : margin.top;
        margin.right = typeof _.right !== 'undefined' ? _.right : margin.right;
        margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
        margin.left = typeof _.left !== 'undefined' ? _.left : margin.left;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) { return width; }
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) { return height; }
        height = _;
        return chart;
    };

    chart.rotate = function(_) {
        if (!arguments.length) { return rotate; }
        rotate = _;
        return chart;
    };

    chart.scale = function(_) {
        if (!arguments.length) { return scale; }
        scale = _;
        return chart;
    };

    chart.shading = function(_) {
        if (!arguments.length) { return shading; }
        shading = _;
        return chart;
    };

    chart.labels = function(_) {
        if (!arguments.length) { return labels; }
        labels = _;
        return chart;
    };

    chart.watercolor = function(_) {
        if (!arguments.length) { return watercolor; }
        watercolor = _;
        return chart;
    };

    chart.countrycolor = function(_) {
        if (!arguments.length) { return countrycolor; }
        countrycolor = _;
        return chart;
    };

    chart.pointcolor = function(_) {
        if (!arguments.length) { return pointcolor; }
        pointcolor = _;
        return chart;
    };

    return chart;
};
