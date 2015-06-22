var CssSyntaxError = require('./css-syntax-error');
var PreviousMap    = require('./previous-map');
var Declaration    = require('./declaration');
var Comment        = require('./comment');
var AtRule         = require('./at-rule');
var Root           = require('./root');
var Rule           = require('./rule');

var path = require('path');

var isSpace = /\s/;

var sequence = 0;

// CSS parser
var Parser = (function(){"use strict";var PRS$0 = (function(o,t){o["__proto__"]={"a":t};return o["a"]===t})({},{});var DP$0 = Object.defineProperty;var GOPD$0 = Object.getOwnPropertyDescriptor;var MIXIN$0 = function(t,s){for(var p in s){if(s.hasOwnProperty(p)){DP$0(t,p,GOPD$0(s,p));}}return t};var proto$0={};
    function Parser(source) {var opts = arguments[1];if(opts === void 0)opts = { };
        this.source = source.toString();
        this.opts   = opts;

        sequence    += 1;
        this.id      = ((new Date()).valueOf() * 10  + sequence).toString();
        this.root    = new Root();
        this.current = this.root;
        this.parents = [this.current];
        this.type    = 'rules';
        this.types   = [this.type];

        this.pos    = -1;
        this.line   = 1;
        this.lines  = [];
        this.column = 0;
        this.buffer = '';
    }DP$0(Parser,"prototype",{"configurable":false,"enumerable":false,"writable":false});

    proto$0.loop = function() {
        this.next  = this.source[0];
        var length = this.source.length - 1;
        while ( this.pos < length ) {
            this.move();
            this.nextLetter();
        }
        this.endFile();
    };

    proto$0.setMap = function() {
        var map = new PreviousMap(this.root, this.opts, this.id);
        if ( map.text ) {
            this.root.prevMap = map;
            this.root.eachInside( function(i ) {return i.source.map = map} );
        }
    };

    proto$0.nextLetter = function() {
        return this.inString()   ||
               this.inComment()  ||
               this.isComment()  ||
               this.isString()   ||

               this.isWrong()    ||

               this.inAtrule()   || this.isAtrule()   ||
               this.isBlockEnd() ||
               this.inSelector() || this.isSelector() ||
               this.inProperty() || this.isProperty() || this.inValue();
    };

    // Parsers

    proto$0.inString = function(close) {
        if ( this.quote ) {
            if ( this.escape && !close ) {
                this.escape = false;
            } else if ( this.letter == '\\' ) {
                this.escape = true;
            } else if ( this.letter == this.quote || close ) {
                this.quote = undefined;
            }
            this.trimmed += this.letter;

            return true;
        }
    };

    proto$0.isString = function() {
        if ( this.letter == '"' || this.letter == "'" ) {
            this.quote    = this.letter;
            this.quotePos = { line: this.line, column: this.column };
            this.trimmed += this.letter;

            return true;
        }
    };

    proto$0.inComment = function(close) {var $D$0;
        if ( this.inside('comment') ) {
            if ( close || ( this.letter == '*' && this.next == '/' ) ) {
                var text, left, right;
                text = ($D$0 = this.startSpaces(this.prevBuffer()))[0], left = $D$0[1], $D$0;
                text = ($D$0 = this.endSpaces(text))[0], right = $D$0[1], $D$0;
                this.current.text  = text;
                this.current.left  = left;
                this.current.right = right;
                this.move();
                this.pop();
            ;$D$0 = void 0}
            return true;

        } else if ( this.inside('value-comment') ) {
            if ( close || ( this.letter == '*' && this.next == '/' ) ) {
                this.popType();
                this.move();
            }
            return true;
        }
    };

    proto$0.isComment = function() {
        if ( this.letter == '/' && this.next == '*' ) {
            if ( this.inside('rules') || this.inside('decls') ) {
                this.init( new Comment() );
                this.addType('comment');
                this.move();
                this.buffer = '';
            } else {
                this.commentPos = { line: this.line, column: this.column };
                this.addType('value-comment');
                this.move();
                return true;
            }
        }
    };

    proto$0.isWrong = function() {
        if ( this.letter == '{' ) {
            if ( this.inside('decls') || this.inside('value') ) {
                this.error("Unexpected {");
            }
        }

        if ( this.inside('prop') ) {
            if ( this.letter == '}' || this.letter == ';') {
                if ( this.opts.safe ) {
                    var string = this.current.before + this.buffer;
                    this.current.parent.decls.pop();
                    this.pop();
                    this.buffer    = string;
                    this.semicolon = this.prevSemicolon;
                } else {
                    this.error('Missing property value');
                }
            }
        }
    };

    proto$0.isAtrule = function() {
        if ( this.letter == '@' && this.inside('rules') ) {
            this.init( new AtRule() );
            this.current.name = '';
            this.addType('atrule-name');

            return true;
        }
    };

    proto$0.inAtrule = function(close) {var $D$1;
        if ( this.inside('atrule-name') ) {
            if ( this.space() ) {
                this.checkAtruleName();
                this.buffer  = this.buffer.substr(this.current.name.length);
                this.trimmed = '';
                this.setType('atrule-param');

            } else if ( this.letter == ';' || this.letter == '{' || close ) {
                this.current.between = '';
                this.checkAtruleName();
                this.endAtruleParams();

            } else {
                this.current.name += this.letter;
            }
            return true;

        } else if ( this.inside('atrule-param') ) {
            if ( this.letter == ';' || this.letter == '{' || close ) {
                var raw, left, right;
                raw = ($D$1 = this.startSpaces( this.prevBuffer() ))[0], left = $D$1[1], $D$1;
                raw = ($D$1 = this.endSpaces(raw))[0], right = $D$1[1], $D$1;
                this.raw('params', this.trimmed.trim(), raw);
                if ( this.current.params ) {
                    this.current.afterName = left;
                    this.current.between   = right;
                } else {
                    this.current.afterName = '';
                    this.current.between   = left + right;
                }
                this.endAtruleParams();

            ;$D$1 = void 0} else {
                this.trimmed += this.letter;
            }
            return true;
        }
    };

    proto$0.inSelector = function() {var $D$2;
        if ( this.inside('selector') ) {
            if ( this.letter == '{' ) {
                var raw, spaces;
                raw = ($D$2 = this.endSpaces( this.prevBuffer() ))[0], spaces = $D$2[1], $D$2;
                this.raw('selector', this.trimmed.trim(), raw);
                this.current.between = spaces;
                this.semicolon = false;
                this.buffer    = '';
                this.setType('decls');
            ;$D$2 = void 0} else {
                this.trimmed += this.letter;
            }

            return true;
        }
    };

    proto$0.isSelector = function() {
        if ( !this.space() && this.inside('rules') ) {
            this.init( new Rule() );

            if ( this.letter == '{' ) {
                this.addType('decls');
                this.current.selector = '';
                this.current.between  = '';
                this.semicolon = false;
                this.buffer    = '';
            } else {
                this.addType('selector');
                this.buffer  = this.letter;
                this.trimmed = this.letter;
            }

            return true;
        }
    };

    proto$0.isBlockEnd = function(close) {var this$0 = this;
        if ( this.letter == '}' || close ) {
            if ( this.parents.length == 1 ) {
                if ( !this.opts.safe ) {
                    this.error('Unexpected }');
                }
            } else {
                if ( this.inside('value') ) {
                    this.fixEnd( function()  {return this$0.inValue('close')} );
                } else if ( this.inside('prop') && this.opts.safe ) {
                    this.inProperty('close');
                } else {
                    if ( this.semicolon ) this.current.semicolon = true;
                    this.current.after = this.prevBuffer();
                }
                this.pop();
            }

            return true;
        }
    };

    proto$0.inProperty = function(close) {
        if ( this.inside('prop') ) {
            if ( this.letter == ':' || close ) {
                if ( this.buffer[0] == '*' || this.buffer[0] == '_' ) {
                    this.current.before += this.buffer[0];
                    this.trimmed = this.trimmed.substr(1);
                    this.buffer  = this.buffer.substr(1);
                }

                this.current.prop = this.trimmed.trim();
                var length = this.current.prop.length;
                this.current.between = this.prevBuffer().substr(length);
                this.buffer = '';

                if ( close ) {
                    this.current.value = '';
                    this.pop();
                } else {
                    this.setType('value');
                }
                this.trimmed = '';
            } else if ( this.letter == '{' ) {
                this.error('Unexpected { in decls');
            } else {
                this.trimmed += this.letter;
            }

            return true;
        }
    };

    proto$0.isProperty = function() {
        if ( this.inside('decls') && !this.space() && this.letter != ';' ) {
            this.init( new Declaration() );
            this.addType('prop');
            this.buffer        = this.letter;
            this.trimmed       = this.letter;
            this.prevSemicolon = this.semicolon;
            this.semicolon     = false;

            return true;
        }
    };

    proto$0.inValue = function(close) {var $D$3;
        if ( this.inside('value') ) {
            if ( this.letter == '(' ) {
                this.inBrackets = true;
            } else if ( this.inBrackets && this.letter == ')' ) {
                this.inBrackets = false;
            }

            if ( (this.letter == ';' && !this.inBrackets) || close ) {
                if ( this.letter == ';' ) this.semicolon = true;

                var raw, spaces;
                raw = ($D$3 = this.startSpaces(this.prevBuffer()))[0], spaces = $D$3[1], $D$3;
                var trim      = this.trimmed.trim();

                if ( raw.indexOf('!important') != -1 ) {
                    var match = raw.match(/\s+!important\s*$/);
                    if ( match ) {
                        this.current.important  = true;
                        this.current._important = match[0];
                        raw  = raw.slice(0, -match[0].length);
                        trim = trim.replace(/\s+!important$/, '');
                    }
                }

                this.raw('value', trim, raw);
                this.current.between += ':' + spaces;
                this.pop();
            ;$D$3 = void 0} else {
                this.trimmed += this.letter;
            }

            return true;
        }
    };

    proto$0.endFile = function() {var this$0 = this;
        if ( this.inside('atrule-param') || this.inside('atrule-name') ) {
            this.fixEnd( function()  {return this$0.inAtrule('close')} );
        }

        if ( this.inside('comment') || this.inside('value-comment') ) {
            if ( this.opts.safe ) {
                this.buffer += '/';
                this.inComment('close');
                this.closeBlocks();
            } else {
                if ( this.inside('comment') ) {
                    this.error('Unclosed comment', this.current.source.start);
                } else {
                    this.error('Unclosed comment', this.commentPos);
                }
            }

        } else if ( this.parents.length > 1 ) {
            if ( this.opts.safe ) {
                this.closeBlocks();
            } else {
                this.error('Unclosed block', this.current.source.start);
            }

        } else if ( this.quote ) {
            if ( this.opts.safe ) {
                this.inString('close');
                this.closeBlocks();
            } else {
                this.error('Unclosed quote', this.quotePos);
            }

        } else {
            this.root.after = this.buffer;
        }
    };

    // Helpers

    proto$0.error = function(message) {var pos = arguments[1];if(pos === void 0)pos = { line: this.line, column: this.column };
        throw new CssSyntaxError(message, this.source, pos, this.opts.from);
    };

    proto$0.move = function() {
        this.pos    += 1;
        this.column += 1;
        this.letter  = this.next;
        this.next    = this.source[this.pos + 1];
        this.buffer += this.letter;

        if ( this.letter == "\n" ) {
            this.lines[this.line] = this.column - 1;
            this.line  += 1;
            this.column = 0;
        }
    };

    proto$0.prevBuffer = function() {
        return this.buffer.slice(0, -1);
    };

    proto$0.inside = function(type) {
        return this.type == type;
    };

    proto$0.space = function() {
        return this.letter.trim() === '';
    };

    proto$0.init = function(node) {
        this.current.push(node);
        this.parents.push(node);
        this.current = node;

        this.current.source = {
            start: {
                line:   this.line,
                column: this.column
            },
            content: this.source
        };
        if ( this.opts.from ) {
            this.current.source.file = path.resolve(this.opts.from);
        } else {
            this.current.source.id = this.id;
        }
        this.current.before = this.buffer.slice(0, -1);
        this.buffer = '';
    };

    proto$0.raw = function(prop, value, origin) {
        this.current[prop] = value;
        if ( value != origin ) {
            this.current['_' + prop] = { value: value, raw: origin };
        }
    };

    proto$0.fixEnd = function(callback) {
        var start, after;
        if ( this.letter == '}' ) {
            start = this.buffer.search(/\s*\}$/);
            after = this.buffer.slice(start, -1);
        } else {
            start = this.buffer.search(/\s*$/);
            after = this.buffer.substr(start);
        }
        this.buffer = this.buffer.substr(0, start + 1);

        var el = this.current;
        callback.apply(this);

        var lines = after.match(/\n/g);
        if ( lines ) {
            el.source.end.line -= lines.length;
            var all  = this.lines[el.source.end.line];
            var last = after.indexOf("\n");
            if ( last == -1 ) last = after.length;
            el.source.end.column = all - last;
        } else {
            el.source.end.column -= after.length;
        }

        this.current.after = after;
        this.buffer = after;
    };

    proto$0.pop = function() {
        this.current.source.end = {
            line:   this.line,
            column: this.column
        };

        this.popType();
        this.parents.pop();
        this.current = this.parents[this.parents.length - 1];
        this.buffer  = '';
    };

    proto$0.addType = function(type) {
        this.types.push(type);
        this.type = type;
    };

    proto$0.setType = function(type) {
        this.types[this.types.length - 1] = type;
        this.type = type;
    };

    proto$0.popType = function() {
        this.types.pop();
        this.type = this.types[this.types.length - 1];
    };

    proto$0.atruleType = function() {
        var name = this.current.name.toLowerCase();
        if ( name == 'page' || name == 'font-face' ) {
            return 'decls';
        } else if ( name.slice(-8) == 'viewport' ) {
            return 'decls';
        } else {
            return 'rules';
        }
    };

    proto$0.endAtruleParams = function() {
        if ( this.letter == '{' ) {
            var type = this.atruleType();
            this.current.addMixin(type);
            this.setType(type);
            this.buffer = '';
        } else {
            if ( this.letter == ';' ) this.current.semicolon = true;
            this.pop();
        }
    };

    proto$0.checkAtruleName = function() {
        if ( this.current.name === '' ) this.error('At-rule without name');
    };

    proto$0.startSpaces = function(string) {
        var match = string.match(/^\s+/);
        if ( match ) {
            var pos = match[0].length;
            return [string.substr(pos), match[0]];
        } else {
            return [string, ''];
        }
    };

    proto$0.endSpaces = function(string) {
        var match = string.match(/\s+$/);
        if ( match ) {
            var pos = match[0].length;
            return [string.slice(0, -pos), match[0]];
        } else {
            return [string, ''];
        }
    };

    proto$0.closeBlocks = function() {
        for ( var i = 0; i < this.parents.length; i++ ) {
            this.buffer += '{';
            this.isBlockEnd('close');
        }
    };
MIXIN$0(Parser.prototype,proto$0);proto$0=void 0;return Parser;})();

module.exports = function (source) {var opts = arguments[1];if(opts === void 0)opts = { };
    if ( opts.map == 'inline' ) opts.map = { inline: true };

    var parser = new Parser(source, opts);
    parser.loop();
    parser.setMap();

    return parser.root;
};
