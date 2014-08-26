    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_addGradient.js
    dimple._addGradient = function (seriesValue, id, categoryAxis, data, chart, duration, colorProperty) {

        var sArray = [].concat(seriesValue),
            grad = chart._group.select("#" + id),
            cats = [],
            field = categoryAxis.position + "Field",
            transition = true,
            colors = [];

        data.forEach(function (d) {
            if (cats.indexOf(d[field]) === -1 && d.aggField.join("_") === sArray.join("_")) {
                cats.push(d[field]);
            }
        }, this);

        cats = cats.sort(function (a, b) { return categoryAxis._scale(a) - categoryAxis._scale(b); });

        if (grad.node() === null) {
            transition = false;
            grad = chart._group.append("linearGradient")
                .attr("id", id)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", (categoryAxis.position === "x" ? categoryAxis._scale(cats[0]) + ((chart._widthPixels() / cats.length) / 2) : 0))
                .attr("y1", (categoryAxis.position === "y" ? categoryAxis._scale(cats[0]) - ((chart._heightPixels() / cats.length) / 2) : 0))
                .attr("x2", (categoryAxis.position === "x" ? categoryAxis._scale(cats[cats.length - 1]) + ((chart._widthPixels() / cats.length) / 2) : 0))
                .attr("y2", (categoryAxis.position === "y" ? categoryAxis._scale(cats[cats.length - 1]) - ((chart._heightPixels() / cats.length) / 2) : 0));
        }

        cats.forEach(function (cat, j) {

            var row = {},
                k = 0;

            for (k = 0; k < data.length; k = k + 1) {
                if (data[k].aggField.join("_") === sArray.join("_") && data[k][field].join("_") === cat.join("_")) {
                    row = data[k];
                    break;
                }
            }

            colors.push({ offset: Math.round((j / (cats.length - 1)) * 100) + "%", color: row[colorProperty] });
        }, this);

        if (transition) {
            chart._handleTransition(grad.selectAll("stop").data(colors), duration, chart)
                .attr("offset", function(d) { return d.offset; })
                .attr("stop-color", function(d) { return d.color; });
        } else {
            grad.selectAll("stop")
                .data(colors)
                .enter()
                .append("stop")
                .attr("offset", function(d) { return d.offset; })
                .attr("stop-color", function(d) { return d.color; });
        }
    };

