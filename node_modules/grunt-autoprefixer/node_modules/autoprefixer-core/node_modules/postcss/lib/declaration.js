var Node   = require('./node');
var vendor = require('./vendor');

// CSS declaration like “color: black” in rules
var Declaration = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(Declaration, super$0);var proto$0={};
    function Declaration(defaults) {
        this.type = 'decl';
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(Declaration,super$0);Declaration.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":Declaration,"configurable":true,"writable":true}});DP$0(Declaration,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    proto$0.defaultStyle = function() {
        return { before: "\n    ", between: ': ' };
    };

    // Stringify declaration
    proto$0.stringify = function(builder, semicolon) {
        var style = this.style();

        if ( style.before ) builder(style.before);
        var string = this.prop + style.between + this.stringifyRaw('value');

        if ( this.important ) {
            string += this._important || ' !important';
        }

        if ( semicolon ) string += ';';
        builder(string, this);
    };

    // Clean `before` and `between` property in clone to copy it from new
    // parent rule
    proto$0.clone = function() {var overrides = arguments[0];if(overrides === void 0)overrides = { };
        var cloned = super$0.prototype.clone.call(this, overrides);
        delete cloned.before;
        delete cloned.between;
        return cloned;
    };
MIXIN$0(Declaration.prototype,proto$0);proto$0=void 0;return Declaration;})(Node);

module.exports = Declaration;
