/*global expect, describe, it, beforeEach */
define(["dimple", "d3"], function (dimple, d3) {
    "use strict";

    describe("newSvg", function () {

        beforeEach(function () {
            d3.select("body").append("div").attr("id", "itDiv");
        });

        it("should add by tag", function () {
            var svg;
            dimple.newSvg("body", 200, 100);
            svg = document.getElementsByTagName("svg");
            expect(svg.length).toEqual(1);
            expect(document.getElementsByTagName("svg")[0].parentNode.tagName).toEqual("BODY");
            expect(d3.select(svg[0]).attr("width")).toEqual("200");
            expect(d3.select(svg[0]).attr("height")).toEqual("100");
            d3.select(svg[0]).remove();
            expect(svg.length).toEqual(0);
        });

        it("should add by id", function () {
            var svg;
            dimple.newSvg("#itDiv", 200, 100);
            svg = document.getElementsByTagName("svg");
            expect(svg.length).toEqual(1);
            expect(document.getElementsByTagName("svg")[0].parentNode.tagName).toEqual("DIV");
            expect(d3.select(svg[0]).attr("width")).toEqual("200");
            expect(d3.select(svg[0]).attr("height")).toEqual("100");
            d3.select(svg[0]).remove();
        });

        it("should add by default parameter", function () {
            var svg;
            dimple.newSvg(null, 200, 100);
            svg = document.getElementsByTagName("svg");
            expect(svg.length).toEqual(1);
            expect(document.getElementsByTagName("svg")[0].parentNode.tagName).toEqual("BODY");
            expect(d3.select(svg[0]).attr("width")).toEqual("200");
            expect(d3.select(svg[0]).attr("height")).toEqual("100");
            d3.select(svg[0]).remove();
        });

        it("should check selection exceptions", function() {
            var svg,
                random = function () {
                    dimple.newSvg("random string", 200, 100);
                };
            expect(random).toThrow("The 'random string' selector did not match any elements.  Please prefix with '#' to select by id or '.' to select by class");
            svg = document.getElementsByTagName("svg");
            expect(svg.length).toEqual(0);
        });
    });

});