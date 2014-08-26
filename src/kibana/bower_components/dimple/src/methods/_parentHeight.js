    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_parentHeight.js
    dimple._parentHeight = function (parent) {
        // This one seems to work in Chrome - good old Chrome!
        var returnValue = parent.offsetHeight;
        // This does it for IE
        if (returnValue <= 0 || returnValue === null || returnValue === undefined) {
            returnValue = parent.clientHeight;
        }
        // FireFox is the hard one this time.  See this bug report:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=649285//
        // It's dealt with by trying to recurse up the dom until we find something
        // we can get a size for.  Usually the parent of the SVG.  It's a bit costly
        // but I don't know of any other way.
        if (returnValue <= 0 || returnValue === null || returnValue === undefined) {
            if (parent.parentNode === null || parent.parentNode === undefined) {
                // Give up - Recursion Exit Point
                returnValue = 0;
            } else {
                // Get the size from the parent recursively
                returnValue = dimple._parentHeight(parent.parentNode);
            }
        }
        return returnValue;
    };
