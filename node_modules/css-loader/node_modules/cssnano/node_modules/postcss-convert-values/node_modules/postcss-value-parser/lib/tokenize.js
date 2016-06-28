'use strict';

var singleQuote  = '\''.charCodeAt(0);
var doubleQuote  = '"'.charCodeAt(0);
var backslash    = '\\'.charCodeAt(0);
var slash        = '/'.charCodeAt(0);
var newline      = '\n'.charCodeAt(0);
var space        = ' '.charCodeAt(0);
var feed         = '\f'.charCodeAt(0);
var tab          = '\t'.charCodeAt(0);
var cr           = '\r'.charCodeAt(0);
var comma        = ','.charCodeAt(0);
var colon        = ':'.charCodeAt(0);
var openBracket  = '('.charCodeAt(0);
var closeBracket = ')'.charCodeAt(0);

module.exports = function (input) {
    var tokens = [];
    var value = input;

    var code, next, quote, escape, escapePos, last, nodes;

    var length = value.length;
    var pos = 0;
    var stack = [tokens];
    var balanced = 0;

    while (pos < length) {
        code = value.charCodeAt(pos);
        last = tokens[tokens.length - 1];

        switch (code) {
            case newline:
            case space:
            case tab:
            case cr:
            case feed:
                next = pos;
                do {
                    next += 1;
                    if (next === length) {
                        break;
                    }
                    code = value.charCodeAt(next);
                } while (code === space   ||
                        code === newline ||
                        code === tab     ||
                        code === cr      ||
                        code === feed);
                if (last && last.type === 'div') {
                    last.after = value.slice(pos, next);
                } else {
                    tokens.push({
                        type: 'space',
                        value: value.slice(pos, next)
                    });
                }
                pos = next - 1;
                break;

            case comma:
            case colon:
            case slash:
                last = last && last.type === 'space' ? tokens.pop() : null;
                tokens.push({
                    type: 'div',
                    value: String.fromCharCode(code),
                    before: last && last.type === 'space' ? last.value : '',
                    after: ''
                });

                break;

            case openBracket:
                balanced += 1;
                nodes = [];
                tokens.push({
                    type: 'function',
                    value: last && last.type === 'word' ? tokens.pop().value : '',
                    nodes: nodes
                });
                stack.push(nodes);
                tokens = nodes;
                break;

            case closeBracket:
                balanced -= 1;
                tokens = stack[balanced];
                break;

            case singleQuote:
            case doubleQuote:
                quote = String.fromCharCode(code);
                next = pos;
                do {
                    escape = false;
                    next = value.indexOf(quote, next + 1);
                    if (next === -1) {
                        value += quote;
                        next = value.length - 1;
                    }
                    escapePos = next;
                    while (value.charCodeAt(escapePos - 1) === backslash) {
                        escapePos -= 1;
                        escape = !escape;
                    }
                } while (escape);
                tokens.push({
                    type: 'string',
                    quote: quote,
                    value: value.slice(pos + 1, next)
                });
                pos = next;
                break;

            case backslash:
                next = pos;
                escape = true;
                while (value.charCodeAt(next + 1) === backslash) {
                    next += 1;
                    escape = !escape;
                }
                code = value.charCodeAt(next + 1);
                if (escape && code !== slash   &&
                              code !== space   &&
                              code !== newline &&
                              code !== tab     &&
                              code !== cr      &&
                              code !== feed) {
                    next += 1;
                }
                tokens.push({
                    type: 'word',
                    value: value.slice(pos, next + 1)
                });
                pos = next;
                break;

            default:
                next = pos;
                do {
                    next += 1;
                    if (next === length) {
                        break;
                    }
                    code = value.charCodeAt(next);
                } while (code !== singleQuote &&
                         code !== doubleQuote &&
                         code !== backslash   &&
                         code !== slash       &&
                         code !== newline     &&
                         code !== space       &&
                         code !== feed        &&
                         code !== tab         &&
                         code !== cr          &&
                         code !== comma       &&
                         code !== colon       &&
                         code !== openBracket &&
                         code !== closeBracket);

                tokens.push({
                    type: 'word',
                    value: value.slice(pos, next)
                });
                pos = next - 1;
                break;
        }

        pos += 1;
    }

    return stack[0];
};
