var Declaration = require('./declaration');
var Container   = require('./container');
var Comment     = require('./comment');
var AtRule      = require('./at-rule');
var Result      = require('./result');
var Rule        = require('./rule');

// Root of CSS
var Root = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(Root, super$0);var proto$0={};
    function Root(defaults) {
        this.type  = 'root';
        this.rules = [];
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(Root,super$0);Root.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":Root,"configurable":true,"writable":true}});DP$0(Root,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Fix spaces on insert before first rule
    proto$0.normalize = function(child, sample, type) {var S_ITER$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol.iterator||'@@iterator';var S_MARK$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol["__setObjectSetter__"];function GET_ITER$0(v){if(v){if(Array.isArray(v))return 0;var f;if(S_MARK$0)S_MARK$0(v);if(typeof v==='object'&&typeof (f=v[S_ITER$0])==='function'){if(S_MARK$0)S_MARK$0(void 0);return f.call(v);}if(S_MARK$0)S_MARK$0(void 0);if((v+'')==='[object Generator]')return v;}throw new Error(v+' is not iterable')};var $D$0;var $D$1;var $D$2;
        var childs = super$0.prototype.normalize.call(this, child, sample, type);

        $D$0 = GET_ITER$0(childs);$D$2 = $D$0 === 0;$D$1 = ($D$2 ? childs.length : void 0);for ( child ;$D$2 ? ($D$0 < $D$1) : !($D$1 = $D$0["next"]())["done"];){child = ($D$2 ? childs[$D$0++] : $D$1["value"]);
            if ( type == 'prepend' ) {
                if ( this.rules.length > 1 ) {
                    sample.before = this.rules[1].before;
                } else if ( this.rules.length == 1 ) {
                    sample.before = this.after;
                }
            } else {
                if ( this.rules.length > 1 ) {
                    child.before = sample.before;
                } else {
                    child.before = this.after;
                }
            }
        };$D$0 = $D$1 = $D$2 = void 0;

        return childs;
    };

    // Stringify styles
    proto$0.stringify = function(builder) {
        this.stringifyContent(builder);
        if ( this.after) builder(this.after);
    };

    // Generate processing result with optional source map
    proto$0.toResult = function() {var opts = arguments[0];if(opts === void 0)opts = { };
        return new Result(this, opts);
    };
MIXIN$0(Root.prototype,proto$0);proto$0=void 0;return Root;})(Container.WithRules);

module.exports = Root;
