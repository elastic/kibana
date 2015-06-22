var Node = require('./node');

// CSS comment between declarations or rules
var Comment = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(Comment, super$0);var proto$0={};
    function Comment(defaults) {
        this.type = 'comment';
        super$0.call(this, defaults);
    }if(super$0!==null)SP$0(Comment,super$0);Comment.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":Comment,"configurable":true,"writable":true}});DP$0(Comment,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    // Default spaces for new node
    proto$0.defaultStyle = function() {
       return { left: ' ', right: ' ' };
    };

    // Stringify declaration
    proto$0.stringify = function(builder) {
        var style = this.style();
        if ( this.before ) builder(this.before);
        builder('/*' + style.left + this.text + style.right + '*/', this);
    };
MIXIN$0(Comment.prototype,proto$0);proto$0=void 0;return Comment;})(Node);

module.exports = Comment;
