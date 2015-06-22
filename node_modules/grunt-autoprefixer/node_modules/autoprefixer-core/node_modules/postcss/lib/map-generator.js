var Result = require('./result');

var mozilla = require('source-map');
var Base64  = require('js-base64').Base64;
var path    = require('path');

// All tools to generate source maps
var MapGenerator = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var proto$0={};
    function MapGenerator(root, opts) {
        this.root    = root;
        this.opts    = opts;
        this.mapOpts = opts.map || { };
    }DP$0(MapGenerator,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Should map be generated
    proto$0.isMap = function() {
        if ( typeof(this.opts.map) != 'undefined' ) {
            return !!this.opts.map;
        } else {
            return this.previous().length > 0;
        }
    };

    // Return source map arrays from previous compilation step (like Sass)
    proto$0.previous = function() {var this$0 = this;
        if ( !this.previousMaps ) {
            this.previousMaps = [];
            this.root.eachInside( function(node)  {
                if ( node.source && node.source.map ) {
                    if ( this$0.previousMaps.indexOf(node.source.map) == -1 ) {
                        this$0.previousMaps.push(node.source.map);
                    }
                }
            });
        }

        return this.previousMaps;
    };

    // Should we inline source map to annotation comment
    proto$0.isInline = function() {
        if ( typeof(this.mapOpts.inline) != 'undefined' ) {
            return this.mapOpts.inline;
        }
        return this.previous().some( function(i ) {return i.inline} );
    };

    // Should we set sourcesContent
    proto$0.isSourcesContent = function() {
        if ( typeof(this.mapOpts.sourcesContent) != 'undefined' ) {
            return this.mapOpts.sourcesContent;
        }
        return this.previous().some( function(i ) {return i.withContent()} );
    };

    // Clear source map annotation comment
    proto$0.clearAnnotation = function() {
        var last = this.root.last;
        if ( !last ) return;
        if ( last.type != 'comment' ) return;

        if ( last.text.match(/^# sourceMappingURL=/) ) {
            last.removeSelf();
        }
    };

    // Set origin CSS content
    proto$0.setSourcesContent = function() {var this$0 = this;
        var already = { };
        this.root.eachInside( function(node)  {
            if ( node.source ) {
                var file = node.source.file || node.source.id;
                if ( file && !already[file] ) {
                    already[file] = true;
                    var relative = this$0.relative(file);
                    this$0.map.setSourceContent(relative, node.source.content);
                }
            }
        });
    };

    // Apply source map from previous compilation step (like Sass)
    proto$0.applyPrevMaps = function() {var S_ITER$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol.iterator||'@@iterator';var S_MARK$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol["__setObjectSetter__"];function GET_ITER$0(v){if(v){if(Array.isArray(v))return 0;var f;if(S_MARK$0)S_MARK$0(v);if(typeof v==='object'&&typeof (f=v[S_ITER$0])==='function'){if(S_MARK$0)S_MARK$0(void 0);return f.call(v);}if(S_MARK$0)S_MARK$0(void 0);if((v+'')==='[object Generator]')return v;}throw new Error(v+' is not iterable')};var $D$0;var $D$1;var $D$2;var $D$3;
        $D$3 = (this.previous());$D$0 = GET_ITER$0($D$3);$D$2 = $D$0 === 0;$D$1 = ($D$2 ? $D$3.length : void 0);for ( var prev ;$D$2 ? ($D$0 < $D$1) : !($D$1 = $D$0["next"]())["done"];){prev = ($D$2 ? $D$3[$D$0++] : $D$1["value"]);
            var from = this.relative(prev.file);
            var root = prev.root || path.dirname(prev.file);
            var map;

            if ( this.mapOpts.sourcesContent === false ) {
                map = new mozilla.SourceMapConsumer(prev.text);
                map.sourcesContent = map.sourcesContent.map( function(i ) {return null} );
            } else {
                map = prev.consumer();
            }

            this.map.applySourceMap(map, from, this.relative(root));
        };$D$0 = $D$1 = $D$2 = $D$3 = void 0;
    };

    // Should we add annotation comment
    proto$0.isAnnotation = function() {
        if ( this.isInline() ) {
            return true ;
        } else if ( typeof(this.mapOpts.annotation) != 'undefined' ) {
            return this.mapOpts.annotation;
        } else if ( this.previous().length ) {
            return this.previous().some( function(i ) {return i.annotation} );
        } else {
            return true;
        }
    };

    // Add source map annotation comment if it is needed
    proto$0.addAnnotation = function() {
        var content;

        if ( this.isInline() ) {
            content = "data:application/json;base64," +
                       Base64.encode( this.map.toString() );

        } else if ( typeof(this.mapOpts.annotation) == 'string' ) {
            content = this.mapOpts.annotation;

        } else {
            content = this.outputFile() + '.map';
        }

        this.css += "\n/*# sourceMappingURL=" + content + " */";
    };

    // Return output CSS file path
    proto$0.outputFile = function() {
        return this.opts.to ? this.relative(this.opts.to) : 'to.css';
    };

    // Return Result object with map
    proto$0.generateMap = function() {
        this.stringify();
        if ( this.isSourcesContent() )    this.setSourcesContent();
        if ( this.previous().length > 0 ) this.applyPrevMaps();
        if ( this.isAnnotation() )        this.addAnnotation();

        if ( this.isInline() ) {
            return [this.css];
        } else {
            return [this.css, this.map];
        }
    };

    // Return path relative from output CSS file
    proto$0.relative = function(file) {
        var from = this.opts.to ? path.dirname(this.opts.to) : '.';

        if ( typeof(this.mapOpts.annotation) == 'string' ) {
            from = path.dirname( path.resolve(from, this.mapOpts.annotation) );
        }

        file = path.relative(from, file);
        if ( path.sep == '\\' ) {
            return file.replace(/\\/g, '/');
        } else {
            return file;
        }
    };

    // Return path of node source for map
    proto$0.sourcePath = function(node) {
        return this.relative(node.source.file || node.source.id);
    };

    // Return CSS string and source map
    proto$0.stringify = function() {var this$0 = this;
        this.css = '';
        this.map = new mozilla.SourceMapGenerator({ file: this.outputFile() });

        var line   = 1;
        var column = 1;

        var lines, last;
        var builder = function(str, node, type)  {
            this$0.css += str;

            if ( node && node.source && node.source.start && type != 'end' ) {
                this$0.map.addMapping({
                    source:   this$0.sourcePath(node),
                    original: {
                        line:   node.source.start.line,
                        column: node.source.start.column - 1
                    },
                    generated: {
                        line:   line,
                        column: column - 1
                    }
                });
            }

            lines = str.match(/\n/g);
            if ( lines ) {
                line  += lines.length;
                last   = str.lastIndexOf("\n");
                column = str.length - last;
            } else {
                column = column + str.length;
            }

            if ( node && node.source && node.source.end && type != 'start' ) {
              this$0.map.addMapping({
                  source:   this$0.sourcePath(node),
                  original: {
                      line:   node.source.end.line,
                      column: node.source.end.column
                  },
                  generated: {
                      line:   line,
                      column: column
                  }
              });
            }
        };

        this.root.stringify(builder);
    };

    // Return Result object with or without map
    proto$0.generate = function() {
        this.clearAnnotation();

        if ( this.isMap() ) {
            return this.generateMap();
        } else {
            return [this.root.toString()];
        }
    };
MIXIN$0(MapGenerator.prototype,proto$0);proto$0=void 0;return MapGenerator;})();

module.exports = MapGenerator;
