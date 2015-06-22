var Declaration = require('./declaration');
var Comment     = require('./comment');
var AtRule      = require('./at-rule');
var Result      = require('./result');
var Rule        = require('./rule');
var Root        = require('./root');

// List of functions to process CSS
var PostCSS = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var proto$0={};
    function PostCSS() {var processors = arguments[0];if(processors === void 0)processors = [];var this$0 = this;
        this.processors = processors.map( function(i)  {return this$0.normalize(i)} );
    }DP$0(PostCSS,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Add another function to CSS processors
    proto$0.use = function(processor) {
        processor = this.normalize(processor);
        this.processors.push(processor);
        return this;
    };

    // Process CSS throw installed processors
    proto$0.process = function(css) {var S_ITER$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol.iterator||'@@iterator';var S_MARK$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol["__setObjectSetter__"];function GET_ITER$0(v){if(v){if(Array.isArray(v))return 0;var f;if(S_MARK$0)S_MARK$0(v);if(typeof v==='object'&&typeof (f=v[S_ITER$0])==='function'){if(S_MARK$0)S_MARK$0(void 0);return f.call(v);}if(S_MARK$0)S_MARK$0(void 0);if((v+'')==='[object Generator]')return v;}throw new Error(v+' is not iterable')};var $D$0;var $D$1;var $D$2;var $D$3;var opts = arguments[1];if(opts === void 0)opts = { };
        if ( opts.map == 'inline' ) opts.map = { inline: true };

        var parsed;
        if ( css instanceof Root ) {
            parsed = css;
        } else if ( css instanceof Result ) {
            parsed = css.root;
        } else {
            parsed = postcss.parse(css, opts);
        }

        $D$3 = (this.processors);$D$0 = GET_ITER$0($D$3);$D$2 = $D$0 === 0;$D$1 = ($D$2 ? $D$3.length : void 0);for ( var processor ;$D$2 ? ($D$0 < $D$1) : !($D$1 = $D$0["next"]())["done"];){processor = ($D$2 ? $D$3[$D$0++] : $D$1["value"]);
            var returned = processor(parsed, opts);
            if ( returned instanceof Root ) parsed = returned;
        };$D$0 = $D$1 = $D$2 = $D$3 = void 0;

        return parsed.toResult(opts);
    };

    // Return processor function
    proto$0.normalize = function(processor) {
        var type = typeof(processor);
        if ( (type == 'object' || type == 'function') && processor.postcss ) {
            return processor.postcss;
        } else {
            return processor;
        }
    };
MIXIN$0(PostCSS.prototype,proto$0);proto$0=void 0;return PostCSS;})();

// Framework for CSS postprocessors
//
//   var processor = postcss(function (css) {
//       // Change nodes in css
//   });
//   processor.process(css)
var postcss = function () {var SLICE$0 = Array.prototype.slice;var processors = SLICE$0.call(arguments, 0);
    return new PostCSS(processors);
};

// Compile CSS to nodes
postcss.parse = require('./parse');

// Nodes shortcuts
postcss.comment = function (defaults) {
    return new Comment(defaults);
};
postcss.atRule = function (defaults) {
    return new AtRule(defaults);
};
postcss.decl = function (defaults) {
    return new Declaration(defaults);
};
postcss.rule = function (defaults) {
    return new Rule(defaults);
};
postcss.root = function (defaults) {
    return new Root(defaults);
};

module.exports = postcss;
