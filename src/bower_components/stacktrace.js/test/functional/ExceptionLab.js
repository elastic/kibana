/*global module, exports, define*/
(function(global) {
    function createException() {
        return ((function(x) {
            try {
                x.undef();
                return x;
            } catch (ex) {
                return ex;
            }
        })(null));
    }

    function printProp(prop, value) {
        if (typeof value === "string") {
            value = '"' + value.replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, '\\n" +\n    "') + '"';
        }
        return prop + ': ' + value;
    }

    function getExceptionProps(ex) {
        /*jshint forin:false*/
        var prop, props = [], exceptionPropertyNames = {
            message: true,
            name: true,
            stack: true,
            stacktrace: true,
            'arguments': true,
            type: true
        };

        // find all (including non-enumerable) own properties
        if (typeof Object.getOwnPropertyNames === "function") {
            var ownPropertyNames = Object.getOwnPropertyNames(ex);
            for (var i = 0; i < ownPropertyNames.length; i++) {
                exceptionPropertyNames[ownPropertyNames[i]] = true;
            }
        }

        // find own and inherited enumerable properties
        for (prop in ex) {
            exceptionPropertyNames[prop] = true;
        }

        for (prop in exceptionPropertyNames) {
            var value = ex[prop];
            if (typeof value !== "undefined") {
                props.push(printProp(prop, value));
            }
        }
        return props;
    }

    var api = {
        createException: createException,
        getExceptionProps: getExceptionProps
    };

    if (typeof exports === 'object') {
        // Node
        module.exports = api;
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(api);
    } else {
        // Browser globals
        global.ExceptionLab = api;
    }
}(this));
