/*global expect, describe, it, beforeEach */
define(["dimple"], function (dimple) {
    "use strict";

    describe("_rollUp", function () {
        var data,
            getResults;

        beforeEach(function () {
            data = [
                { "Field 1": "a", "Field 2": "x", "Field 3": "s", "Field 4": 13 },
                { "Field 1": "a", "Field 2": "y", "Field 3": "s", "Field 4": 14 },
                { "Field 1": "a", "Field 2": "z", "Field 3": "t", "Field 4": 15 }
            ];

            // Flatten the ordered resultset for easy comparison
            getResults = function(data, fields) {
                var rolledUp = dimple._rollUp(data, fields, ["Field 1", "Field 2", "Field 3", "Field 4"]),
                    retString = "";
                rolledUp.forEach(function (d, i) {
                    var addField = function (field) {
                        retString += "'" + field + "':";
                        if (d[field] instanceof Array) {
                            retString += "['" + d[field].join("','") + "']";
                        } else {
                            retString += "'" + d[field] + "'";
                        }
                    };
                    retString += (i > 0 ? "," : "") + "{";
                    addField("Field 1");
                    retString += ",";
                    addField("Field 2");
                    retString += ",";
                    addField("Field 3");
                    retString += ",";
                    addField("Field 4");
                    retString += "}";
                });
                return retString;
            };

        });
        it("Rolls up grouped by a single field", function () {
            expect(getResults(data, "Field 1"))
                .toEqual("{'Field 1':'a','Field 2':['x','y','z'],'Field 3':['s','s','t'],'Field 4':['13','14','15']}");
            expect(getResults(data, "Field 2"))
                .toEqual("{'Field 1':['a'],'Field 2':'x','Field 3':['s'],'Field 4':['13']},{'Field 1':['a'],'Field 2':'y','Field 3':['s'],'Field 4':['14']},{'Field 1':['a'],'Field 2':'z','Field 3':['t'],'Field 4':['15']}");
            expect(getResults(data, "Field 3"))
                .toEqual("{'Field 1':['a','a'],'Field 2':['x','y'],'Field 3':'s','Field 4':['13','14']},{'Field 1':['a'],'Field 2':['z'],'Field 3':'t','Field 4':['15']}");
            expect(getResults(data, "Field 4"))
                .toEqual("{'Field 1':['a'],'Field 2':['x'],'Field 3':['s'],'Field 4':'13'},{'Field 1':['a'],'Field 2':['y'],'Field 3':['s'],'Field 4':'14'},{'Field 1':['a'],'Field 2':['z'],'Field 3':['t'],'Field 4':'15'}");
        });

        it("Rolls up grouped by two fields", function () {
            expect(getResults(data, ["Field 1", "Field 2"]))
                .toEqual("{'Field 1':'a','Field 2':'x','Field 3':['s'],'Field 4':['13']},{'Field 1':'a','Field 2':'y','Field 3':['s'],'Field 4':['14']},{'Field 1':'a','Field 2':'z','Field 3':['t'],'Field 4':['15']}");
            expect(getResults(data, ["Field 1", "Field 3"]))
                .toEqual("{'Field 1':'a','Field 2':['x','y'],'Field 3':'s','Field 4':['13','14']},{'Field 1':'a','Field 2':['z'],'Field 3':'t','Field 4':['15']}");
            expect(getResults(data, ["Field 1", "Field 4"]))
                .toEqual("{'Field 1':'a','Field 2':['x'],'Field 3':['s'],'Field 4':'13'},{'Field 1':'a','Field 2':['y'],'Field 3':['s'],'Field 4':'14'},{'Field 1':'a','Field 2':['z'],'Field 3':['t'],'Field 4':'15'}");
            expect(getResults(data, ["Field 2", "Field 3"]))
                .toEqual("{'Field 1':['a'],'Field 2':'x','Field 3':'s','Field 4':['13']},{'Field 1':['a'],'Field 2':'y','Field 3':'s','Field 4':['14']},{'Field 1':['a'],'Field 2':'z','Field 3':'t','Field 4':['15']}");
            expect(getResults(data, ["Field 2", "Field 4"]))
                .toEqual("{'Field 1':['a'],'Field 2':'x','Field 3':['s'],'Field 4':'13'},{'Field 1':['a'],'Field 2':'y','Field 3':['s'],'Field 4':'14'},{'Field 1':['a'],'Field 2':'z','Field 3':['t'],'Field 4':'15'}");
            expect(getResults(data, ["Field 3", "Field 4"]))
                .toEqual("{'Field 1':['a'],'Field 2':['x'],'Field 3':'s','Field 4':'13'},{'Field 1':['a'],'Field 2':['y'],'Field 3':'s','Field 4':'14'},{'Field 1':['a'],'Field 2':['z'],'Field 3':'t','Field 4':'15'}");
        });

        it("Rolls up grouped by three fields", function () {
            expect(getResults(data, ["Field 1", "Field 2", "Field 3"]))
                .toEqual("{'Field 1':'a','Field 2':'x','Field 3':'s','Field 4':['13']},{'Field 1':'a','Field 2':'y','Field 3':'s','Field 4':['14']},{'Field 1':'a','Field 2':'z','Field 3':'t','Field 4':['15']}");
            expect(getResults(data, ["Field 1", "Field 2", "Field 4"]))
                .toEqual("{'Field 1':'a','Field 2':'x','Field 3':['s'],'Field 4':'13'},{'Field 1':'a','Field 2':'y','Field 3':['s'],'Field 4':'14'},{'Field 1':'a','Field 2':'z','Field 3':['t'],'Field 4':'15'}");
            expect(getResults(data, ["Field 1", "Field 3", "Field 4"]))
                .toEqual("{'Field 1':'a','Field 2':['x'],'Field 3':'s','Field 4':'13'},{'Field 1':'a','Field 2':['y'],'Field 3':'s','Field 4':'14'},{'Field 1':'a','Field 2':['z'],'Field 3':'t','Field 4':'15'}");
            expect(getResults(data, ["Field 2", "Field 3", "Field 4"]))
                .toEqual("{'Field 1':['a'],'Field 2':'x','Field 3':'s','Field 4':'13'},{'Field 1':['a'],'Field 2':'y','Field 3':'s','Field 4':'14'},{'Field 1':['a'],'Field 2':'z','Field 3':'t','Field 4':'15'}");
        });

        it("Rolls up grouped by all fields", function () {
            expect(getResults(data, ["Field 1", "Field 2", "Field 3", "Field 4"]))
                .toEqual("{'Field 1':'a','Field 2':'x','Field 3':'s','Field 4':'13'},{'Field 1':'a','Field 2':'y','Field 3':'s','Field 4':'14'},{'Field 1':'a','Field 2':'z','Field 3':'t','Field 4':'15'}");
        });
    });

});