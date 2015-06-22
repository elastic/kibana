// Error while CSS parsing
var CssSyntaxError = (function(super$0){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var SP$0 = Object.setPrototypeOf||function(o,p){o["__proto__"]=p;return o};var OC$0 = Object.create;if(!PRS$0)MIXIN$0(CssSyntaxError, super$0);var proto$0={};
    function CssSyntaxError(text, source, pos, file) {
        this.file     = file;
        this.line     = pos.line;
        this.column   = pos.column;
        this.source   = source;
        this.reason   = text;

        this.message  = file ? file : '<css input>';
        this.message += ':' + pos.line + ':' + pos.column + ': ' + text;
    }if(super$0!==null)SP$0(CssSyntaxError,super$0);CssSyntaxError.prototype = OC$0(super$0!==null?super$0.prototype:null,{"constructor":{"value":CssSyntaxError,"configurable":true,"writable":true}});DP$0(CssSyntaxError,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    proto$0.highlight = function(color) {
        var num   = this.line - 1;
        var lines = this.source.split('\n');

        var prev   = num > 0 ? lines[num - 1] + '\n' : '';
        var broken = lines[num];
        var next   = num < lines.length - 1 ? '\n' + lines[num + 1] : '';

        var mark = '\n';
        for ( var i = 0; i < this.column - 1; i++ ) {
            mark += ' ';
        }

        if ( typeof(color) == 'undefined' && typeof(process) != 'undefined' ) {
            if ( process.stdout && process.env ) {
                color = process.stdout.isTTY &&
                       !process.env.NODE_DISABLE_COLORS;
            }
        }

        if ( color ) {
            mark += "\x1B[1;31m^\x1B[0m";
        } else {
            mark += '^';
        }

        return prev + broken + mark + next;
    };

    proto$0.toString = function() {
        return this.message + "\n" + this.highlight();
    };
MIXIN$0(CssSyntaxError.prototype,proto$0);proto$0=void 0;return CssSyntaxError;})(Error);

module.exports = CssSyntaxError;
