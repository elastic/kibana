    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_showBarTooltip.js
    dimple._showBarTooltip = function (e, shape, chart, series) {

        // The margin between the text and the box
        var textMargin = 5,
            // The margin between the ring and the popup
            popupMargin = 10,
           // The popup animation duration in ms
            animDuration = 750,
            // Collect some facts about the highlighted bar
            selectedShape = d3.select(shape),
            x = selectedShape.node().getBBox().x,
            y = selectedShape.node().getBBox().y,
            width = selectedShape.node().getBBox().width,
            height = selectedShape.node().getBBox().height,
            //transform = selectedShape.attr("transform"),
            opacity = selectedShape.attr("opacity"),
            fill = selectedShape.attr("fill"),
            dropDest = series._dropLineOrigin(),
            // Fade the popup stroke mixing the shape fill with 60% white
            popupStrokeColor = d3.rgb(
                d3.rgb(fill).r + 0.6 * (255 - d3.rgb(fill).r),
                d3.rgb(fill).g + 0.6 * (255 - d3.rgb(fill).g),
                d3.rgb(fill).b + 0.6 * (255 - d3.rgb(fill).b)
            ),
            // Fade the popup fill mixing the shape fill with 80% white
            popupFillColor = d3.rgb(
                d3.rgb(fill).r + 0.8 * (255 - d3.rgb(fill).r),
                d3.rgb(fill).g + 0.8 * (255 - d3.rgb(fill).g),
                d3.rgb(fill).b + 0.8 * (255 - d3.rgb(fill).b)
            ),
            t,
            box,
            tipText = series.getTooltipText(e),
            // The running y value for the text elements
            yRunning = 0,
            // The maximum bounds of the text elements
            w = 0,
            h = 0,
            // Values to shift the popup
            translateX,
            translateY,
            transformer,
            offset,
            transformPoint = function (x, y) {
                var matrix = selectedShape.node().getCTM(),
                    position = chart.svg.node().createSVGPoint();
                position.x = x || 0;
                position.y = y || 0;
                return position.matrixTransform(matrix);
            };

        if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
            chart._tooltipGroup.remove();
        }
        chart._tooltipGroup = chart.svg.append("g");

        if (!series.p) {

            offset = (series._isStacked() ? 1 : width / 2);

            // Add a drop line to the x axis
            if (!series.x._hasCategories() && dropDest.y !== null) {
                chart._tooltipGroup.append("line")
                    .attr("x1", (x < series.x._origin ? x + offset : x + width - offset))
                    .attr("y1", (y < dropDest.y ? y + height : y))
                    .attr("x2", (x < series.x._origin ? x + offset : x + width - offset))
                    .attr("y2", (y < dropDest.y ? y + height : y))
                    .style("fill", "none")
                    .style("stroke", fill)
                    .style("stroke-width", 2)
                    .style("stroke-dasharray", ("3, 3"))
                    .style("opacity", opacity)
                    .transition()
                    .delay(animDuration / 2)
                    .duration(animDuration / 2)
                    .ease("linear")
                    // Added 1px offset to cater for svg issue where a transparent
                    // group overlapping a line can sometimes hide it in some browsers
                    // Issue #10
                    .attr("y2", (y < dropDest.y ? dropDest.y - 1 : dropDest.y + 1));
            }

            offset = (series._isStacked() ? 1 : height / 2);

            // Add a drop line to the y axis
            if (!series.y._hasCategories() && dropDest.x !== null) {
                chart._tooltipGroup.append("line")
                    .attr("x1", (x < dropDest.x ? x + width : x))
                    .attr("y1", (y < series.y._origin ? y + offset : y + height - offset))
                    .attr("x2", (x < dropDest.x ? x + width : x))
                    .attr("y2", (y < series.y._origin ? y + offset : y + height - offset))
                    .style("fill", "none")
                    .style("stroke", fill)
                    .style("stroke-width", 2)
                    .style("stroke-dasharray", ("3, 3"))
                    .style("opacity", opacity)
                    .transition()
                    .delay(animDuration / 2)
                    .duration(animDuration / 2)
                    .ease("linear")
                    // Added 1px offset to cater for svg issue where a transparent
                    // group overlapping a line can sometimes hide it in some browsers
                    // Issue #10
                    .attr("x2", (x < dropDest.x ? dropDest.x - 1 : dropDest.x + 1));
            }

        }

        // Add a group for text
        t = chart._tooltipGroup.append("g");
        // Create a box for the popup in the text group
        box = t.append("rect")
            .attr("class", "dimple-tooltip");

        // Create a text object for every row in the popup
        t.selectAll(".dimple-dont-select-any").data(tipText).enter()
            .append("text")
            .attr("class", "dimple-tooltip")
            .text(function (d) { return d; })
            .style("font-family", series.tooltipFontFamily)
            .style("font-size", series._getTooltipFontSize());

        // Get the max height and width of the text items
        t.each(function () {
            w = (this.getBBox().width > w ? this.getBBox().width : w);
            h = (this.getBBox().width > h ? this.getBBox().height : h);
        });

        // Position the text relative to the bar, the absolute positioning
        // will be done by translating the group
        t.selectAll("text")
            .attr("x", 0)
            .attr("y", function () {
                // Increment the y position
                yRunning += this.getBBox().height;
                // Position the text at the centre point
                return yRunning - (this.getBBox().height / 2);
            });

        // Draw the box with a margin around the text
        box.attr("x", -textMargin)
            .attr("y", -textMargin)
            .attr("height", Math.floor(yRunning + textMargin) - 0.5)
            .attr("width", w + 2 * textMargin)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", popupFillColor)
            .style("stroke", popupStrokeColor)
            .style("stroke-width", 2)
            .style("opacity", 0.95);

        // Shift the popup around to avoid overlapping the svg edge
        if (transformPoint(x + width + textMargin + popupMargin + w).x < parseFloat(chart.svg.node().getBBox().width)) {
            // Draw centre right
            translateX = (x + width + textMargin + popupMargin);
            translateY = (y + (height / 2) - ((yRunning - (h - textMargin)) / 2));
        } else if (transformPoint(x - (textMargin + popupMargin + w)).x > 0) {
            // Draw centre left
            translateX = (x - (textMargin + popupMargin + w));
            translateY = (y + (height / 2) - ((yRunning - (h - textMargin)) / 2));
        } else if (transformPoint(0, y + height + yRunning + popupMargin + textMargin).y < parseFloat(chart.svg.node().getBBox().height)) {
            // Draw centre below
            translateX = (x + (width / 2) - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (y + height + 2 * textMargin);
        } else {
            // Draw centre above
            translateX = (x + (width / 2) - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (y - yRunning - (h - textMargin));
        }
        transformer = transformPoint(translateX, translateY);
        t.attr("transform", "translate(" + transformer.x + " , " + transformer.y + ")");
    };