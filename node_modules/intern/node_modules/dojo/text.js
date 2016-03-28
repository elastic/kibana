(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './has'], function (require, exports) {
    var has = require('./has');
    var getText;
    if (has('host-browser')) {
        getText = function (url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.onload = function () {
                callback(xhr.responseText);
            };
            xhr.open('GET', url, true);
            xhr.send(null);
        };
    }
    else if (has('host-node')) {
        var fs = require.nodeRequire ? require.nodeRequire('fs') : require('fs');
        getText = function (url, callback) {
            fs.readFile(url, { encoding: 'utf8' }, function (error, data) {
                if (error) {
                    throw error;
                }
                callback(data);
            });
        };
    }
    else {
        getText = function () {
            throw new Error('dojo/text not supported on this platform');
        };
    }
    function load(resourceId, require, load) {
        getText(require.toUrl(resourceId), load);
    }
    exports.load = load;
});
//# sourceMappingURL=_debug/text.js.map