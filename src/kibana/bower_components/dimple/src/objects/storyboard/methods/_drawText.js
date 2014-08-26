        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/storyboard/methods/drawText.js
        this._drawText = function () {
            if (!this.storyLabel) {
                var chart = this.chart,
                    self = this,
                    xCount = 0;
                // Check for a secondary x axis
                this.chart.axes.forEach(function (a) {
                    if (a.position === "x") {
                        xCount += 1;
                    }
                }, this);
                this.storyLabel = this.chart._group.append("text")
                    .attr("class", "dimple-storyboard-label")
                    .attr("opacity", 1)
                    .attr("x", this.chart._xPixels() + this.chart._widthPixels() * 0.01)
                    .attr("y", this.chart._yPixels() + (this.chart._heightPixels() / 35 > 10 ? this.chart._heightPixels() / 35 : 10) * (xCount > 1 ? 1.25 : -1))
                    .call(function () {
                        if (!chart.noFormats) {
                            this.style("font-family", self.fontFamily)
                                .style("font-size", self._getFontSize());
                        }
                    });
            }
            this.storyLabel
                .text(this.categoryFields.join("\\") + ": " + this.getFrameValue());
        };

