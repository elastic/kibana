    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_showPointTooltip.js
    dimple._showPointTooltip = function (e, shape, chart, series) {

        // The margin between the text and the box
        var textMargin = 5,
        // The margin between the ring and the popup
            popupMargin = 10,
        // The popup animation duration in ms
            animDuration = 750,
        // Collect some facts about the highlighted bubble
            selectedShape = d3.select(shape),
            cx = parseFloat(selectedShape.attr("cx")),
            cy = parseFloat(selectedShape.attr("cy")),
            r = parseFloat(selectedShape.attr("r")),
            opacity = dimple._helpers.opacity(e, chart, series),
            fill = selectedShape.attr("stroke"),
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
        // The running y value for the text elements
            y = 0,
        // The maximum bounds of the text elements
            w = 0,
            h = 0,
            t,
            box,
            tipText = series.getTooltipText(e),
            translateX,
            translateY;

        if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
            chart._tooltipGroup.remove();
        }
        chart._tooltipGroup = chart.svg.append("g");

        // Add a ring around the data point
        chart._tooltipGroup.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", r)
            .attr("opacity", 0)
            .style("fill", "none")
            .style("stroke", fill)
            .style("stroke-width", 1)
            .transition()
            .duration(animDuration / 2)
            .ease("linear")
            .attr("opacity", 1)
            .attr("r", r + series.lineWeight + 2)
            .style("stroke-width", 2);

        // Add a drop line to the x axis
        if (dropDest.y !== null) {
            chart._tooltipGroup.append("line")
                .attr("x1", cx)
                .attr("y1", (cy < dropDest.y ? cy + r + series.lineWeight + 2 : cy - r - series.lineWeight - 2))
                .attr("x2", cx)
                .attr("y2", (cy < dropDest.y ? cy + r + series.lineWeight + 2 : cy - r - series.lineWeight - 2))
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
                .attr("y2", (cy < dropDest.y ? dropDest.y - 1 : dropDest.y + 1));
        }

        // Add a drop line to the y axis
        if (dropDest.x !== null) {
            chart._tooltipGroup.append("line")
                .attr("x1", (cx < dropDest.x ? cx + r + series.lineWeight + 2 : cx - r - series.lineWeight - 2))
                .attr("y1", cy)
                .attr("x2", (cx < dropDest.x ? cx + r + series.lineWeight + 2 : cx - r - series.lineWeight - 2))
                .attr("y2", cy)
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
                .attr("x2", (cx < dropDest.x ? dropDest.x - 1 : dropDest.x + 1));
        }

        // Add a group for text
        t = chart._tooltipGroup.append("g");
        // Create a box for the popup in the text group
        box = t.append("rect")
            .attr("class", "dimple-tooltip");

        // Create a text object for every row in the popup
        t.selectAll(".dont-select-any").data(tipText).enter()
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

        // Position the text relative to the bubble, the absolute positioning
        // will be done by translating the group
        t.selectAll("text")
            .attr("x", 0)
            .attr("y", function () {
                // Increment the y position
                y += this.getBBox().height;
                // Position the text at the centre point
                return y - (this.getBBox().height / 2);
            });

        // Draw the box with a margin around the text
        box.attr("x", -textMargin)
            .attr("y", -textMargin)
            .attr("height", Math.floor(y + textMargin) - 0.5)
            .attr("width", w + 2 * textMargin)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", popupFillColor)
            .style("stroke", popupStrokeColor)
            .style("stroke-width", 2)
            .style("opacity", 0.95);

        // Shift the popup around to avoid overlapping the svg edge
        if (cx + r + textMargin + popupMargin + w < parseFloat(chart.svg.node().getBBox().width)) {
            // Draw centre right
            translateX = (cx + r + textMargin + popupMargin);
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cx - r - (textMargin + popupMargin + w) > 0) {
            // Draw centre left
            translateX = (cx - r - (textMargin + popupMargin + w));
            translateY = (cy - ((y - (h - textMargin)) / 2));
        } else if (cy + r + y + popupMargin + textMargin < parseFloat(chart.svg.node().getBBox().height)) {
            // Draw centre below
            translateX = (cx - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (cy + r + 2 * textMargin);
        } else {
            // Draw centre above
            translateX = (cx - (2 * textMargin + w) / 2);
            translateX = (translateX > 0 ? translateX : popupMargin);
            translateX = (translateX + w < parseFloat(chart.svg.node().getBBox().width) ? translateX : parseFloat(chart.svg.node().getBBox().width) - w - popupMargin);
            translateY = (cy - y - (h - textMargin));
        }
        t.attr("transform", "translate(" + translateX + " , " + translateY + ")");
    };
