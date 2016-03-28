(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", '../Promise'], function (require, exports) {
    var Promise = require('../Promise');
    function xhr(url, options) {
        if (options === void 0) { options = {}; }
        var deferred = new Promise.Deferred(function (reason) {
            request && request.abort();
            throw reason;
        });
        var request = new XMLHttpRequest();
        var response = {
            data: null,
            getHeader: function (name) {
                return request.getResponseHeader(name);
            },
            nativeResponse: request,
            requestOptions: options,
            statusCode: null,
            statusText: null,
            url: url
        };
        if ((!options.user || !options.password) && options.auth) {
            (function () {
                var auth = options.auth.split(':');
                options.user = decodeURIComponent(auth[0]);
                options.password = decodeURIComponent(auth[1]);
            })();
        }
        request.open(options.method, url, !options.blockMainThread, options.user, options.password);
        request.onerror = function (event) {
            deferred.reject(event.error);
        };
        request.onload = function () {
            if (options.responseType === 'xml') {
                response.data = request.responseXML;
            }
            else {
                response.data = request.response;
            }
            response.statusCode = request.status;
            response.statusText = request.statusText;
            deferred.resolve(response);
        };
        request.onprogress = function (event) {
            deferred.progress(event);
        };
        if (options.timeout > 0 && options.timeout !== Infinity) {
            request.timeout = options.timeout;
        }
        for (var header in options.headers) {
            request.setRequestHeader(header, options.headers[header]);
        }
        request.send(options.data);
        return deferred.promise;
    }
    return xhr;
});
//# sourceMappingURL=../_debug/request/xhr.js.map