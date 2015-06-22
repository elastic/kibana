var MapGenerator = require('./map-generator');

// Object with processed CSS
var Result = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var DPS$0 = Object.defineProperties;var proto$0={};
    function Result(root) {var opts = arguments[1];if(opts === void 0)opts = { };
        this.root = root;
        this.opts = opts;
    }DPS$0(Result.prototype,{map: {"get": map$get$0, "configurable":true,"enumerable":true}, css: {"get": css$get$0, "configurable":true,"enumerable":true}});DP$0(Result,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Lazy method to return source map
    function map$get$0() {
        if ( !this.cssCached ) this.stringify();
        return this.mapCached;
    }

    // Lazy method to return CSS string
    function css$get$0() {
        if ( !this.cssCached ) this.stringify();
        return this.cssCached;
    }

    // Return CSS string on any try to print
    proto$0.toString = function() {
        return this.css;
    };

    // Generate CSS and map
    proto$0.stringify = function() {
        var map = new MapGenerator(this.root, this.opts);
        var generated  = map.generate();
        this.cssCached = generated[0];
        this.mapCached = generated[1];
    };
MIXIN$0(Result.prototype,proto$0);proto$0=void 0;return Result;})();

module.exports = Result;
