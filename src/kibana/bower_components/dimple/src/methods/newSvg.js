    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/newSvg.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple#wiki-newSvg
    dimple.newSvg = function (parentSelector, width, height) {
        var selectedShape = null;
        if (parentSelector === null || parentSelector === undefined) {
            parentSelector = "body";
        }
        selectedShape = d3.select(parentSelector);
        if (selectedShape.empty()) {
            throw "The '" + parentSelector + "' selector did not match any elements.  Please prefix with '#' to select by id or '.' to select by class";
        }
        return selectedShape.append("svg").attr("width", width).attr("height", height);
    };

