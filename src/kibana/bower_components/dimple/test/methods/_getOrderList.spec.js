/*global expect, describe, it, beforeEach */

define(["dimple"], function (dimple) {
    "use strict";

    describe("_getOrderedList", function () {
        var data,
            getResults;

        beforeEach(function () {
            data = [
                { "Int": 1, "Float": 234, "Text": "XFBGR", "Date": "12/5/99", "Group": "A"},
                { "Int": 2, "Float": 54.35, "Text": "YTREB", "Date": "1/1/00", "Group": "A"},
                { "Int": 3, "Float": -453, "Text": "XGFDY", "Date": "2 February 2007", "Group": "B"},
                { "Int": 0, "Float": 5436546, "Text": "XGFDE", "Date": "2000-03-01", "Group": "B"},
                { "Int": 5, "Float": 4323, "Text": "YTREB", "Date": "10/10/2000", "Group": "C"},
                { "Int": 6, "Float": 0, "Text": "GFDHN", "Date": "11/10/2000", "Group": "C"},
                { "Int": 7, "Float": -453, "Text": "TRET", "Date": "10/9/2000", "Group": "D"},
                { "Int": 1, "Float": 5436546, "Text": "GFDGFDHG", "Date": "10/10/2000", "Group": "E"}
            ];

            getResults = function (data, field, levelDefinitions) {
                var ordered = dimple._getOrderedList(data, field, levelDefinitions),
                    retString = "";
                ordered.forEach(function (d, i) {
                    retString += (i > 0 ? ", " : "") + d;
                });
                return retString;
            };
        });

        it("Implicitly orders by a single dimension", function () {
            expect(getResults(data, "Int"))
                .toEqual("0, 1, 2, 3, 5, 6, 7");
            expect(getResults(data, "Float"))
                .toEqual("-453, 0, 54.35, 234, 4323, 5436546");
            expect(getResults(data, "Text"))
                .toEqual("GFDGFDHG, GFDHN, TRET, XFBGR, XGFDE, XGFDY, YTREB");
            expect(getResults(data, "Date"))
                .toEqual("12/5/99, 1/1/00, 2000-03-01, 10/9/2000, 10/10/2000, 11/10/2000, 2 February 2007");
        });

        it("Explicitly orders by a single dimension", function () {
            expect(getResults(data, "Int", { ordering : "Int" }))
                .toEqual("0, 1, 2, 3, 5, 6, 7");
            expect(getResults(data, "Float", { ordering : "Float" }))
                .toEqual("-453, 0, 54.35, 234, 4323, 5436546");
            expect(getResults(data, "Text", { ordering : "Text" }))
                .toEqual("GFDGFDHG, GFDHN, TRET, XFBGR, XGFDE, XGFDY, YTREB");
            expect(getResults(data, "Date", { ordering : "Date" }))
                .toEqual("12/5/99, 1/1/00, 2000-03-01, 10/9/2000, 10/10/2000, 11/10/2000, 2 February 2007");
        });

        it("Orders descending by a single dimension", function () {
            expect(getResults(data, "Int", { ordering : "Int", desc : true }))
                .toEqual("7, 6, 5, 3, 2, 1, 0");
            expect(getResults(data, "Float", { ordering : "Float", desc : true }))
                .toEqual("5436546, 4323, 234, 54.35, 0, -453");
            expect(getResults(data, "Text", { ordering : "Text", desc : true }))
                .toEqual("YTREB, XGFDY, XGFDE, XFBGR, TRET, GFDHN, GFDGFDHG");
            expect(getResults(data, "Date", { ordering : "Date", desc : true }))
                .toEqual("2 February 2007, 11/10/2000, 10/10/2000, 10/9/2000, 2000-03-01, 1/1/00, 12/5/99");
        });

        it("Orders by a passed array", function () {
            expect(getResults(data, "Int", { ordering : [3, 7, 0, 5, 2, 1, 6] }))
                .toEqual("3, 7, 0, 5, 2, 1, 6");
            expect(getResults(data, "Int", { ordering : [3, 7, 0, 5, 2, 1, 6], desc : true }))
                .toEqual("6, 1, 2, 5, 0, 7, 3");
            expect(getResults(data, "Int", { ordering : [3, 7, 0] }))
                .toEqual("3, 7, 0, 1, 2, 5, 6");
            expect(getResults(data, "Int", { ordering : [3, 7, 0], desc : true }))
                .toEqual("0, 7, 3, 1, 2, 5, 6");
            expect(getResults(data, "Int", { ordering : ["3", "7", "0", "5", "2", "1", "6"] }))
                .toEqual("3, 7, 0, 5, 2, 1, 6");
            expect(getResults(data, "Int", { ordering : ["3", "7", "0", "5", "2", "1", "6"], desc : true }))
                .toEqual("6, 1, 2, 5, 0, 7, 3");
            expect(getResults(data, "Int", { ordering : ["3", "7", "0"] }))
                .toEqual("3, 7, 0, 1, 2, 5, 6");
            expect(getResults(data, "Int", { ordering : ["3", "7", "0"], desc : true }))
                .toEqual("0, 7, 3, 1, 2, 5, 6");
        });

        it("Orders by a custom function", function () {
            expect(getResults(data, "Text", { ordering : function (a, b) { return a.Text.length - b.Text.length; }}))
                .toEqual("TRET, GFDHN, XFBGR, XGFDE, XGFDY, YTREB, GFDGFDHG");
            expect(getResults(data, "Text", { ordering : function (a, b) { return a.Text.length - b.Text.length; }, desc : true }))
                .toEqual("GFDGFDHG, GFDHN, XFBGR, XGFDE, XGFDY, YTREB, TRET");
        });

        it("Orders by a second category", function () {
            expect(getResults(data, "Int", { ordering : "Text" }))
                .toEqual("6, 7, 1, 0, 3, 2, 5");
            expect(getResults(data, "Int", { ordering : "Text", desc : true }))
                .toEqual("2, 5, 3, 0, 1, 7, 6");
            expect(getResults(data, "Group", { ordering : "Float" }))
                .toEqual("D, A, C, B, E");
            expect(getResults(data, "Group", { ordering : "Float", desc : true }))
                .toEqual("E, B, C, A, D");
        });

        it("Orders by a third category", function () {
            expect(getResults(data, "Int", [{ ordering : "Group" }, { ordering : "Float" }]))
                .toEqual("2, 1, 3, 0, 6, 5, 7");
            expect(getResults(data, "Int", [{ ordering : "Group", desc : true}, { ordering : "Float" }]))
                .toEqual("7, 6, 5, 3, 0, 2, 1");
            expect(getResults(data, "Int", [{ ordering : "Group"}, { ordering : "Float", desc : true }]))
                .toEqual("1, 2, 0, 3, 5, 6, 7");
            expect(getResults(data, "Int", [{ ordering : "Group", desc : true}, { ordering : "Float", desc : true }]))
                .toEqual("7, 5, 6, 0, 3, 1, 2");
        });
    });
});