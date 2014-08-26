        // Source: /src/objects/chart/methods/addLegend.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addLegend
        this.addLegend = function (x, y, width, height, horizontalAlign, series) {
            // Use all series by default
            series = (series === null || series === undefined ? this.series : [].concat(series));
            horizontalAlign = (horizontalAlign === null || horizontalAlign === undefined ? "left" : horizontalAlign);
            // Create the legend
            var legend = new dimple.legend(this, x, y, width, height, horizontalAlign, series);
            // Add the legend to the array
            this.legends.push(legend);
            // Return the legend object
            return legend;
        };