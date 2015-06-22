var mozilla = require('source-map');
var Base64  = require('js-base64').Base64;
var path    = require('path');
var fs      = require('fs');

// Detect previous map
var PreviousMap = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var proto$0={};
    function PreviousMap(root, opts, id) {
        this.file = opts.from || id;

        this.loadAnnotation(root);
        var inlinePrefix = '# sourceMappingURL=data:';
        this.inline = this.startWith(this.annotation, inlinePrefix);

        var text = this.loadMap(opts.map ? opts.map.prev : undefined);
        if ( text ) this.text = text;
    }DP$0(PreviousMap,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Return SourceMapConsumer object to read map
    proto$0.consumer = function() {
        if ( !this.consumerCache ) {
            this.consumerCache = new mozilla.SourceMapConsumer(this.text);
        }
        return this.consumerCache;
    };

    // Is map has sources content
    proto$0.withContent = function() {
        return !!(this.consumer().sourcesContent &&
                  this.consumer().sourcesContent.length > 0);
    };

    // Is `string` is starting with `start`
    proto$0.startWith = function(string, start) {
        if ( !string ) return false;
        return string.substr(0, start.length) == start;
    };

    // Load for annotation comment from previous compilation step
    proto$0.loadAnnotation = function(root) {
        var last = root.last;
        if ( !last ) return;
        if ( last.type != 'comment' ) return;

        if ( this.startWith(last.text, '# sourceMappingURL=') ) {
            this.annotation = last.text;
        }
    };

    // Encode different type of inline
    proto$0.decodeInline = function(text) {
        var uri    = '# sourceMappingURL=data:application/json,';
        var base64 = '# sourceMappingURL=data:application/json;base64,';

        if ( this.startWith(text, uri) ) {
            return decodeURIComponent( text.substr(uri.length) );

        } else if ( this.startWith(text, base64) ) {
            return Base64.decode( text.substr(base64.length) );

        } else {
            var encoding = text.match(/data:application\/json;([^,]+),/)[1];
            throw new Error('Unsupported source map encoding ' + encoding);
        }
    };

    // Load previous map
    proto$0.loadMap = function(prev) {
        if ( prev === false ) return;

        if ( prev ) {
            if ( typeof(prev) == 'string' ) {
                return prev;
            } else if ( prev instanceof mozilla.SourceMapConsumer ) {
                return mozilla.SourceMapGenerator
                    .fromSourceMap(prev).toString();
            } else if ( prev instanceof mozilla.SourceMapGenerator ) {
                return prev.toString();
            } else if ( typeof(prev) == 'object' && prev.mappings ) {
                return JSON.stringify(prev);
            } else {
                throw new Error('Unsupported previous source map format: ' +
                    prev.toString());
            }

        } else if ( this.inline ) {
            return this.decodeInline(this.annotation);

        } else if ( this.annotation ) {
            var map = this.annotation.replace('# sourceMappingURL=', '');
            if ( this.file ) map = path.join(path.dirname(this.file), map);

            this.root = path.dirname(map);
            if ( fs.existsSync && fs.existsSync(map) ) {
                return fs.readFileSync(map, 'utf-8').toString().trim();
            }
        }
    };
MIXIN$0(PreviousMap.prototype,proto$0);proto$0=void 0;return PreviousMap;})();

module.exports = PreviousMap;
