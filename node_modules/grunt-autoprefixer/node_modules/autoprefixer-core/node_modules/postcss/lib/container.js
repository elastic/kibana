var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;var Node        = require('./node');
var Declaration = require('./declaration');

// CSS node, that contain another nodes (like at-rules or rules with selectors)
var Container = (function(super$0){"use strict";function Container() {super$0.apply(this, arguments)}if(!PRS$0)MIXIN$0(Container, super$0);if(super$0!==null)SP$0(Container,super$0);Container.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":Container,"configurable":true,"writable":true}, first: {"get": first$get$0, "configurable":true,"enumerable":true}, last: {"get": last$get$0, "configurable":true,"enumerable":true}, list: {"get": list$get$0, "configurable":true,"enumerable":true}});DP$0(Container,"prototype",{"configurable":false,"enumerable":false,"writable":false});var proto$0={};var S_ITER$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol.iterator||'@@iterator';var S_MARK$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol["__setObjectSetter__"];function GET_ITER$0(v){if(v){if(Array.isArray(v))return 0;var f;if(S_MARK$0)S_MARK$0(v);if(typeof v==='object'&&typeof (f=v[S_ITER$0])==='function'){if(S_MARK$0)S_MARK$0(void 0);return f.call(v);}if(S_MARK$0)S_MARK$0(void 0);if((v+'')==='[object Generator]')return v;}throw new Error(v+' is not iterable')};
    // Stringify container childs
    proto$0.stringifyContent = function(builder) {
        if ( !this.rules && !this.decls ) return;

        var i, last = this.list.length - 1;
        if ( this.rules ) {
            for ( i = 0; i < this.rules.length; i++ ) {
                this.rules[i].stringify(builder, last == i);
            }

        } else if ( this.decls ) {
            for ( i = 0; i < this.decls.length; i++ ) {
                this.decls[i].stringify(builder, last != i || this.semicolon);
            }
        }
    };

    // Generate default spaces before }
    proto$0.defaultAfter = function() {
        if ( this.list.length === 0 ) {
            return '';
        } else {
            var last = this.list[0].before;
            if ( typeof(last) != 'undefined' && last.indexOf("\n") == -1 ) {
                return this.list[0].before;
            } else {
                return "\n";
            }
        }
    };

    // Stringify node with start (for example, selector) and brackets block
    // with child inside
    proto$0.stringifyBlock = function(builder, start) {
        var style = this.style();

        if ( this.before ) builder(this.before);
        builder(start, this, 'start');

        this.stringifyContent(builder);

        if ( style.after ) builder(style.after);
        builder('}', this, 'end');
    };

    // Add child to end of list without any checks.
    // Please, use `append()` method, `push()` is mostly for parser.
    proto$0.push = function(child) {
        child.parent = this;
        this.list.push(child);
        return this;
    };

    // Execute `callback` on every child element. First arguments will be child
    // node, second will be index.
    //
    //   css.each( (rule, i) => {
    //       console.log(rule.type + ' at ' + i);
    //   });
    //
    // It is safe for add and remove elements to list while iterating:
    //
    //  css.each( (rule) => {
    //      css.insertBefore( rule, addPrefix(rule) );
    //      # On next iteration will be next rule, regardless of that
    //      # list size was increased
    //  });
    proto$0.each = function(callback) {
        if ( !this.lastEach ) this.lastEach = 0;
        if ( !this.indexes )  this.indexes = { };

        this.lastEach += 1;
        var id = this.lastEach;
        this.indexes[id] = 0;

        var list = this.list;
        if ( !list ) return;

        var index, result;
        while ( this.indexes[id] < list.length ) {

          index  = this.indexes[id];
          result = callback(list[index], index);
          if ( result === false ) break;

          this.indexes[id] += 1;
        }

        delete this.indexes[id];

        if ( result === false ) return false;
    };

    // Execute callback on every child in all rules inside.
    //
    // First argument will be child node, second will be index inside parent.
    //
    //   css.eachInside( (node, i) => {
    //       console.log(node.type + ' at ' + i);
    //   });
    //
    // Also as `each` it is safe of insert/remove nodes inside iterating.
    proto$0.eachInside = function(callback) {
        return this.each( function(child, i)  {
            var result = callback(child, i);

            if ( result !== false && child.eachInside ) {
                result = child.eachInside(callback);
            }

            if ( result === false ) return result;
        });
    };

    // Execute callback on every declaration in all rules inside.
    // It will goes inside at-rules recursivelly.
    //
    // First argument will be declaration node, second will be index inside
    // parent rule.
    //
    //   css.eachDecl( (decl, i) => {
    //       console.log(decl.prop + ' in ' + decl.parent.selector + ':' + i);
    //   });
    //
    // Also as `each` it is safe of insert/remove nodes inside iterating.
    proto$0.eachDecl = function(callback) {
        // Different realization will be inside subclasses
    };

    // Execute callback on every block comment (only between rules
    // and declarations, not inside selectors and values) in all rules inside.
    //
    // First argument will be comment node, second will be index inside
    // parent rule.
    //
    //   css.eachComment( (comment, i) => {
    //       console.log(comment.content + ' at ' + i);
    //   });
    //
    // Also as `each` it is safe of insert/remove nodes inside iterating.
    proto$0.eachComment = function(callback) {
        return this.eachInside( function(child, i)  {
            if ( child.type == 'comment' ) {
                var result = callback(child, i);
                if ( result === false ) return result;
            }
        });
    };

    // Add child to container.
    //
    //   css.append(rule);
    //
    // You can add declaration by hash:
    //
    //   rule.append({ prop: 'color', value: 'black' });
    proto$0.append = function(child) {var $D$0;var $D$1;var $D$2;
        var childs = this.normalize(child, this.list[this.list.length - 1]);
        $D$0 = GET_ITER$0(childs);$D$2 = $D$0 === 0;$D$1 = ($D$2 ? childs.length : void 0);for ( child ;$D$2 ? ($D$0 < $D$1) : !($D$1 = $D$0["next"]())["done"];){child = ($D$2 ? childs[$D$0++] : $D$1["value"]);
            this.list.push(child);
        };$D$0 = $D$1 = $D$2 = void 0;
        return this;
    };

    // Add child to beginning of container
    //
    //   css.prepend(rule);
    //
    // You can add declaration by hash:
    //
    //   rule.prepend({ prop: 'color', value: 'black' });
    proto$0.prepend = function(child) {var $D$3;var $D$4;var $D$5;
        var childs = this.normalize(child, this.list[0], 'prepend').reverse();
        $D$3 = GET_ITER$0(childs);$D$5 = $D$3 === 0;$D$4 = ($D$5 ? childs.length : void 0);for ( child ;$D$5 ? ($D$3 < $D$4) : !($D$4 = $D$3["next"]())["done"];){child = ($D$5 ? childs[$D$3++] : $D$4["value"]);
            this.list.unshift(child);
        };$D$3 = $D$4 = $D$5 = void 0;

        for ( var id in this.indexes ) {
            this.indexes[id] = this.indexes[id] + childs.length;
        }

        return this;
    };

    // Insert new `added` child before `exist`.
    // You can set node object or node index (it will be faster) in `exist`.
    //
    //   css.insertAfter(1, rule);
    //
    // You can add declaration by hash:
    //
    //   rule.insertBefore(1, { prop: 'color', value: 'black' });
    proto$0.insertBefore = function(exist, add) {var $D$6;var $D$7;var $D$8;
        exist = this.index(exist);

        var type   = exist === 0 ? 'prepend' : false;
        var childs = this.normalize(add, this.list[exist], type).reverse();
        $D$6 = GET_ITER$0(childs);$D$8 = $D$6 === 0;$D$7 = ($D$8 ? childs.length : void 0);for ( var child ;$D$8 ? ($D$6 < $D$7) : !($D$7 = $D$6["next"]())["done"];){child = ($D$8 ? childs[$D$6++] : $D$7["value"]);
            this.list.splice(exist, 0, child);
        };$D$6 = $D$7 = $D$8 = void 0;

        for ( var id in this.indexes ) {
            this.indexes[id] = this.indexes[id] + childs.length;
        }

        return this;
    };

    // Insert new `added` child after `exist`.
    // You can set node object or node index (it will be faster) in `exist`.
    //
    //   css.insertAfter(1, rule);
    //
    // You can add declaration by hash:
    //
    //   rule.insertAfter(1, { prop: 'color', value: 'black' });
    proto$0.insertAfter = function(exist, add) {var $D$9;var $D$10;var $D$11;
        exist = this.index(exist);

        var childs = this.normalize(add, this.list[exist]).reverse();
        $D$9 = GET_ITER$0(childs);$D$11 = $D$9 === 0;$D$10 = ($D$11 ? childs.length : void 0);for ( var child ;$D$11 ? ($D$9 < $D$10) : !($D$10 = $D$9["next"]())["done"];){child = ($D$11 ? childs[$D$9++] : $D$10["value"]);
            this.list.splice(exist + 1, 0, child);
        };$D$9 = $D$10 = $D$11 = void 0;

        for ( var id in this.indexes ) {
            this.indexes[id] = this.indexes[id] + childs.length;
        }

        return this;
    };

    // Remove `child` by index or node.
    //
    //   css.remove(2);
    proto$0.remove = function(child) {
        child = this.index(child);
        this.list.splice(child, 1);

        for ( var id in this.indexes ) {
            var index = this.indexes[id];
            if ( index >= child ) {
                this.indexes[id] = index - 1;
            }
        }

        return this;
    };

    // Return true if all childs return true in `condition`.
    // Just shorcut for `list.every`.
    proto$0.every = function(condition) {
        return this.list.every(condition);
    };

    // Return true if one or more childs return true in `condition`.
    // Just shorcut for `list.some`.
    proto$0.some = function(condition) {
        return this.list.some(condition);
    };

    // Return index of child
    proto$0.index = function(child) {
        if ( typeof(child) == 'number' ) {
            return child;
        } else {
            return this.list.indexOf(child);
        }
    };

    // Shortcut to get first child
    function first$get$0() {
        if ( !this.list ) return undefined;
        return this.list[0];
    }

    // Shortcut to get first child
    function last$get$0() {
        if ( !this.list ) return undefined;
        return this.list[this.list.length - 1];
    }

    // Shortcut to get current list
    function list$get$0() {
        return this.rules || this.decls;
    }

    // Normalize child before insert. Copy before from `sample`.
    proto$0.normalize = function(child, sample) {var $D$12;var $D$13;var $D$14;
        var childs;
        if ( child.type == 'root' ) {
            childs = child.rules;
        } else if ( Array.isArray(child) ) {
            childs = child.map( function(i ) {return i.clone()} );
        } else {
            if ( child.parent ) {
                child = child.clone();
            }
            childs = [child];
        }

        $D$12 = GET_ITER$0(childs);$D$14 = $D$12 === 0;$D$13 = ($D$14 ? childs.length : void 0);for ( child ;$D$14 ? ($D$12 < $D$13) : !($D$13 = $D$12["next"]())["done"];){child = ($D$14 ? childs[$D$12++] : $D$13["value"]);
            child.parent = this;
            if ( typeof(child.before) == 'undefined' && sample ) {
                child.before = sample.before;
            }
        };$D$12 = $D$13 = $D$14 = void 0;

        return childs;
    };
MIXIN$0(Container.prototype,proto$0);proto$0=void 0;return Container;})(Node);

// Container with another rules, like this.media at-rule
 Container.WithRules = ((function(super$0){"use strict";if(!PRS$0)MIXIN$0(constructor$0, super$0);var proto$0={};
    function constructor$0(defaults) {
        this.rules = [];
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(constructor$0,super$0);constructor$0.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":constructor$0,"configurable":true,"writable":true}});DP$0(constructor$0,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Execute `callback` on every declaration in all rules inside.
    // It will goes inside at-rules recursivelly.
    //
    // See documentation in `Container#eachDecl`.
    proto$0.eachDecl = function(callback) {
        return this.each( function(child)  {
            if ( child.eachDecl ) {
                var result = child.eachDecl(callback);
                if ( result === false ) return result;
            }
        });
    };

    // Execute `callback` on every rule in conatiner and inside child at-rules.
    //
    // First argument will be rule node, second will be index inside parent.
    //
    //   css.eachRule( (rule, i) => {
    //       if ( parent.type == 'atrule' ) {
    //           console.log(rule.selector + ' in ' + rule.parent.name);
    //       } else {
    //           console.log(rule.selector + ' at ' + i);
    //       }
    //   });
    proto$0.eachRule = function(callback) {
        return this.each( function(child, i)  {
            var result;
            if ( child.type == 'rule' ) {
                result = callback(child, i);
            } else if ( child.eachRule ) {
                result = child.eachRule(callback);
            }
            if ( result === false ) return result;
        });
    };

    // Execute `callback` on every at-rule in conatiner and inside at-rules.
    //
    // First argument will be at-rule node, second will be index inside parent.
    //
    //   css.eachAtRule( (atrule, parent, i) => {
    //       if ( parent.type == 'atrule' ) {
    //           console.log(atrule.name + ' in ' + atrule.parent.name);
    //       } else {
    //           console.log(atrule.name + ' at ' + i);
    //       }
    //   });
    proto$0.eachAtRule = function(callback) {
        return this.eachInside( function(child, i)  {
            if ( child.type == 'atrule' ) {
                var result = callback(child, i);
                if ( result === false ) return result;
            }
        });
    };
MIXIN$0(constructor$0.prototype,proto$0);proto$0=void 0;return constructor$0;})(Container));

// Container with another rules, like this.media at-rule
 Container.WithDecls = ((function(super$0){"use strict";if(!PRS$0)MIXIN$0(constructor$1, super$0);var proto$0={};
    function constructor$1(defaults) {
        this.decls = [];
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(constructor$1,super$0);constructor$1.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":constructor$1,"configurable":true,"writable":true}});DP$0(constructor$1,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Allow to define new declaration as hash
    proto$0.normalize = function(child, sample, type) {
        if ( !child.type && !Array.isArray(child) ) {
            child = new Declaration(child);
        }
        return super$0.prototype.normalize.call(this, child, sample, type);
    };

    // Execute callback on every declaration.
    //
    // See documentation in `Container#eachDecl`.
    proto$0.eachDecl = function(callback) {
        return this.each( function(child, i)  {
            if ( child.type == 'decl' ) {
                var result = callback(child, i);
                if ( result === false ) return result;
            }
        });
    };
MIXIN$0(constructor$1.prototype,proto$0);proto$0=void 0;return constructor$1;})(Container));

module.exports = Container;
