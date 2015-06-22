var Container = require('./container');

// CSS at-rule like “this.keyframes name { }”.
//
// Can contain declarations (like this.font-face or this.page) ot another rules.
var AtRule = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(AtRule, super$0);var proto$0={};
    function AtRule(defaults) {
        this.type = 'atrule';
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(AtRule,super$0);AtRule.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":AtRule,"configurable":true,"writable":true}});DP$0(AtRule,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Different style for this.encoding and this.page at-rules.
    proto$0.styleType = function() {
        return this.type + ((this.rules || this.decls) ? '-body' : '-bodiless');
    };

    proto$0.defaultStyle = function(type) {
        if ( type == 'atrule-body' ) {
            return { between: ' ', after: this.defaultAfter() };
        } else {
            return { between: '' };
        }
    };

    // Load into at-rule mixin for selected content type
    proto$0.addMixin = function(type) {
        var mixin = type == 'rules' ? Container.WithRules : Container.WithDecls;
        if ( !mixin ) return;

        for ( var name in mixin.prototype ) {
            if ( name == 'constructor' ) continue;
            var value = mixin.prototype[name];

            var container = Container.prototype[name] == value;
            var detector  = name == 'append' || name == 'prepend';
            if ( container && !detector ) continue;

            this[name] = value;
        }
        mixin.apply(this);
    };

    // Stringify at-rule
    proto$0.stringify = function(builder, last) {
        var style = this.style();

        var name   = '@' + this.name;
        var params = this.params ? this.stringifyRaw('params') : '';

        if ( typeof(this.afterName) != 'undefined' ) {
            name += this.afterName;
        } else if ( params ) {
            name += ' ';
        }

        if ( this.rules || this.decls ) {
            this.stringifyBlock(builder, name + params + style.between + '{');

        } else {
            if ( this.before ) builder(this.before);
            var semicolon = (!last || this.semicolon) ? ';' : '';
            builder(name + params + style.between + semicolon, this);
        }
    };

    // Hack to detect container type by child type
    proto$0.append = function(child) {
        var mixin = child.type == 'decl' ? 'decls' : 'rules';
        this.addMixin(mixin);
        return this.append(child);
    };

    // Hack to detect container type by child type
    proto$0.prepend = function(child) {
        var mixin = child.type == 'decl' ? 'decls' : 'rules';
        this.addMixin(mixin);
        return this.prepend(child);
    };
MIXIN$0(AtRule.prototype,proto$0);proto$0=void 0;return AtRule;})(Container);

module.exports = AtRule;
