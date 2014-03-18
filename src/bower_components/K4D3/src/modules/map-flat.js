
k4.map = function() {
    'use strict';

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 700,
        height = 400,
        xValue = function(d) { return d[0]; },
        colorScale = d3.scale.quantile();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom;

            // data = data.map(function(d, i) {
            //     return [xValue.call(data, d, i), yValue.call(data, d, i)];
            // });

            var svg = d3.select(this).selectAll('svg').data([data]);
            svg.enter().append('svg').attr('width', width)
                .attr('height', height);

            
            // map vars
            var precision = 0.25;
            var colors = ['#ffebbc','#f8d294','#f2b96e','#ed9d4c','#e97f2e','#e55c13','#e02c00'];
            var colorScale = d3.scale.quantile()
                .domain([ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 ])
                .range(colors);

            // projections
            //var projection = d3.geo.orthographic()
            //    .scale(245)
            //    .rotate([30.2,-41.1])
            //    .translate([width / 2, height / 2])
            //    .clipAngle(90)
            //    .clipExtent([[1, 1], [width - 1, height - 1]])
            //    .precision(0.1);

            var projection = d3.geo.mercator()
                .scale( (width + 1) / 2 / Math.PI )
                .translate([width / 2, height / 1.55])
                //.clipAngle(90)
                .clipExtent([[1, 1], [width - 1, height - 1]])
                .precision(0.1);

            var path = d3.geo.path()
                .projection(projection);

            var graticule = d3.geo.graticule();

            var fg, co, mousePoint = true;



            //d3.json("../lib/json/world-110m.json", function(error, world) {
                
                // console.log('MAP', error, world);
                // bkgd/water
                svg.append("path")
                    .datum({type: "Sphere"})
                    .attr("class", "fg water")
                    .attr("d", path);
                    
                // graticule
                svg.append("path")
                    .datum(graticule)
                    .attr("class", "fg graticule")
                    .attr("d", path);

                // topojson land
                svg.insert("path")
                    .datum(topojson.feature(data, data.objects.land))
                    .attr("class", "fg land")
                    .attr("d", path);
                    
                // add random data to country properties
                var countryData = topojson.feature(data, data.objects.countries).features;
                for (var i = 0; i < countryData.length; i++) {
                    countryData[i].properties = {
                        id: countryData[i].id,
                        val: Math.random()
                    };
                }
                
                // topojson countries
                svg.selectAll("path.countries")
                    .data(countryData)
                    .enter().append("path")
                    .attr("class", function(d) {
                        return "fg countries id" + d.id;
                    })
                    .style("fill", function(d) { 
                        return colorScale(d.properties.val);
                    })
                    .attr("d", path);

                // edge
                svg.append("path")
                    .datum({type: "Sphere"})
                    .attr("class", "fg edge")
                    .attr("d", path);
                    

                fg = svg.selectAll(".fg");
                co = svg.selectAll(".countries");

                // call zoom
                fg.call(d3.behavior.zoom()
                  .translate(projection.translate())
                  .scale(projection.scale())
                  .scaleExtent([100, 300])
                  .on("zoom", redraw));


                // hover
                co.on("mouseover", function(n) {
                    console.log("id:", n.properties.id, "val:", n.properties.val);
                    // bring to front by sort
                    co.sort(function(a, b) {
                        if (a.id === n.id) {
                            return 1;
                        } else {
                            if (b.id === n.id) {
                                return -1;
                            } else {
                                return 0;
                            }
                        }
                    });
                })

                // get globe rotate lat, long
                fg.on("mousedown", function(n) {
                    console.log("Clicked at:", projection.invert(d3.mouse(this))[1], projection.invert(d3.mouse(this))[0]);
                })

                // get globe rotate lat, long
                fg.on("mouseup", function(n) {
                    console.log("Map center:", -projection.rotate()[1], -projection.rotate()[0]);
                })

                // zoom
                //fg.call(d3.geo.zoom()
                //    .projection(projection)
                //    .scaleExtent([projection.scale() * 0.6, projection.scale() * 8])
                //    .on("zoom.redraw", function() {
                //        d3.event.sourceEvent.preventDefault();
                //        fg.attr("d", path);
                //    })
                //);

            //});

            function redraw() {
                if (d3.event) {
                    projection
                        .translate(d3.event.translate)
                        .scale(d3.event.scale);

                }
                svg.selectAll("path").attr("d", path);
                var t = projection.translate();
                //xAxis.attr("x1", t[0]).attr("x2", t[0]);
                //yAxis.attr("y1", t[1]).attr("y2", t[1]);
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

    return chart;
};
