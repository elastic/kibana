var Container   = require('./container');
var Declaration = require('./declaration');
var list        = require('./list');

// CSS rule like “a { }”
var Rule = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(Rule, super$0);var proto$0={};
    function Rule(defaults) {
        this.type = 'rule';
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(Rule,super$0);Rule.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":Rule,"configurable":true,"writable":true}, selectors: {"get": selectors$get$0, "set": selectors$set$0, "configurable":true,"enumerable":true}});DP$0(Rule,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Different style for empty and non-empty rules
    proto$0.styleType = function() {
        return this.type + (this.decls.length ? '-body' : '-empty');
    };

    proto$0.defaultStyle = function(type) {
        if ( type == 'rule-body' ) {
            return { between: ' ', after: this.defaultAfter() };
        } else {
            return { between: ' ', after: '' };
        }
    };

    // Shortcut to get selectors as array

    function selectors$get$0() {
        return list.comma(this.selector);
    }

    function selectors$set$0(values) {
        this.selector = values.join(', ');
    }

    // Stringify rule
    proto$0.stringify = function(builder) {
        this.stringifyBlock(builder,
            this.stringifyRaw('selector') + this.style().between + '{');
    };
MIXIN$0(Rule.prototype,proto$0);proto$0=void 0;return Rule;})(Container.WithDecls);

module.exports = Rule;
