        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_registerEventHandlers.js
        // Register events, handle standard d3 shape events
        this._registerEventHandlers = function (series) {
            if (series._eventHandlers !== null && series._eventHandlers.length > 0) {
                series._eventHandlers.forEach(function (thisHandler) {
                    var name,
                        handler = function (d) {
                            var e = new dimple.eventArgs();
                            if (series.chart.storyboard !== null) {
                                e.frameValue = series.chart.storyboard.getFrameValue();
                            }
                            e.seriesValue = d.aggField;
                            e.xValue = d.x;
                            e.yValue = d.y;
                            e.zValue = d.z;
                            e.pValue = d.p;
                            e.colorValue = d.cValue;
                            e.seriesShapes = series.shapes;
                            e.selectedShape = d3.select(this);
                            thisHandler.handler(e);
                        };
                    if (thisHandler.handler !== null && typeof (thisHandler.handler) === "function") {
                        // Some classes work from markers rather than the shapes (line and area for example)
                        // in these cases the events should be applied to the markers instead.  Issue #15
                        if (series._markers !== null && series._markers !== undefined) {
                            for (name in series._markers) {
                                if (series._markers.hasOwnProperty(name)) {
                                    series._markers[name].on(thisHandler.event, handler);
                                }
                            }
                        } else {
                            series.shapes.on(thisHandler.event, handler);
                        }
                    }
                }, this);
            }
        };

