// Recursivly clone objects
var clone = function (obj, parent) {
    if ( typeof(obj) != 'object' ) return obj;
    var cloned = new obj.constructor();

    for ( var name in obj ) {
        if ( !obj.hasOwnProperty(name) ) continue;
        var value = obj[name];

        if ( name == 'parent' && typeof(value) == 'object' ) {
            if (parent) cloned[name] = parent;
        } else if ( name == 'source' ) {
            cloned[name] = value;
        } else if ( value instanceof Array ) {
            cloned[name] = value.map( function(i ) {return clone(i, cloned)} );
        } else {
            cloned[name] = clone(value, cloned);
        }
    }

    return cloned;
};

// Is `obj` has all keys from `keys`. Return `false` of object with keys from
// `keys` and values from `obj`.
var keys = function (obj, keys) {
    var all = { };

    for ( var key in keys ) {
        if ( typeof(obj[key]) == 'undefined' ) {
            return false;
        } else {
            all[key] = obj[key];
        }
    }

    return all;
};

// Some common methods for all CSS nodes
var Node = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var proto$0={};
    function Node() {var defaults = arguments[0];if(defaults === void 0)defaults = { };
        for ( var name in defaults ) {
            this[name] = defaults[name];
        }
    }DP$0(Node,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Remove this node from parent
    //
    //   decl.removeSelf();
    //
    // Note, that removing by index is faster:
    //
    //   rule.each( (decl, i) => rule.remove(i) );
    proto$0.removeSelf = function() {
        if ( this.parent ) {
            this.parent.remove(this);
        }
        return this;
    };

    // Shortcut to insert nodes before and remove self.
    //
    //   importNode.replace( loadedRoot );
    proto$0.replace = function(nodes) {
        this.parent.insertBefore(this, nodes);
        this.parent.remove(this);
        return this;
    };

    // Return CSS string of current node
    //
    //   decl.toString(); //=> "  color: black"
    proto$0.toString = function() {
        var result  = '';
        var builder = function(str)  {return result += str};
        this.stringify(builder);
        return result;
    };

    // Clone current node
    //
    //   rule.append( decl.clone() );
    //
    // You can override properties while cloning:
    //
    //   rule.append( decl.clone({ value: '0' }) );
    proto$0.clone = function() {var overrides = arguments[0];if(overrides === void 0)overrides = { };
        var cloned = clone(this);
        for ( var name in overrides ) {
            cloned[name] = overrides[name];
        }
        return cloned;
    };

    // Remove `parent` node on cloning to fix circular structures
    proto$0.toJSON = function() {
        var fixed = { };

        for ( var name in this ) {
            if ( !this.hasOwnProperty(name) ) continue;
            if ( name == 'parent' ) continue;
            var value = this[name];

            if ( value instanceof Array ) {
                fixed[name] = value.map( function(i)  {
                    return (typeof(i) == 'object' && i.toJSON) ? i.toJSON() : i;
                });
            } else if ( typeof(value) == 'object' && value.toJSON ) {
                fixed[name] = value.toJSON();
            } else {
                fixed[name] = value;
            }
        }

        return fixed;
    };

    // Default code style
    proto$0.defaultStyle = function() {
        return { };
    };

    // Allow to split node with same type by other critera.
    // For example, to use different style for bodiless at-rules.
    proto$0.styleType = function() {
        return this.type;
    };

    // Copy code style from first node with same type
    proto$0.style = function() {var this$0 = this;
        var type     = this.styleType();
        var defaults = this.defaultStyle(type);

        var all = keys(this, defaults);
        if ( all ) return all;

        var styled = defaults;
        if ( this.parent ) {

            var root = this;
            while ( root.parent ) root = root.parent;

            if ( !root.styleCache ) root.styleCache = { };
            if ( root.styleCache[type] ) {
                styled = root.styleCache[type];

            } else {
                root.eachInside( function(another)  {
                    if ( another.styleType() != type ) return;
                    if ( this$0 == another )             return;

                    all = keys(another, styled);
                    if ( all ) {
                        styled = all;
                        return false;
                    }
                });

                root.styleCache[type] = styled;
            }
        }

        var merge = { };
        for ( var key in styled ) {
            if ( typeof(this[key]) == 'undefined' ) {
                merge[key] = styled[key];
            } else {
                merge[key] = this[key];
            }
        }

        return merge;
    };

    // Use raw value if origin was not changed
    proto$0.stringifyRaw = function(prop) {
        var value = this[prop];
        var raw   = this['_' + prop];
        if ( raw && raw.value === value ) {
            return raw.raw;
        } else {
            return value;
        }
    };
MIXIN$0(Node.prototype,proto$0);proto$0=void 0;return Node;})();

module.exports = Node;
