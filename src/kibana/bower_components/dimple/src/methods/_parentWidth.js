    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_parentWidth.js
    dimple._parentWidth = function (parent) {
        // This one seems to work in Chrome - good old Chrome!
        var returnValue = parent.offsetWidth;
        // This does it for IE
        if (!returnValue || returnValue < 0) {
            returnValue = parent.clientWidth;
        }
        // FireFox is the hard one this time.  See this bug report:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=649285//
        // It's dealt with by trying to recurse up the dom until we find something
        // we can get a size for.  Usually the parent of the SVG.  It's a bit costly
        // but I don't know of any other way.
        if (!returnValue || returnValue < 0) {
            if (!parent.parentNode) {
                // Give up - Recursion Exit Point
                returnValue = 0;
            } else {
                // Get the size from the parent recursively
                returnValue = dimple._parentWidth(parent.parentNode);
            }
        }
        return returnValue;
    };
