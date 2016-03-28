'use strict';

exports.__esModule = true;
exports['default'] = tokenize;
var SINGLE_QUOTE = 39; // `''
var DOUBLE_QUOTE = 34; // `"'
var BACKSLASH = 92; // `\'
var SLASH = 47; // `/'
var NEWLINE = 10; // `\n'
var SPACE = 32; // ` '
var FEED = 12; // `\f'
var TAB = 9; // `\t'
var CR = 13; // `\r'
var OPEN_PARENTHESES = 40; // `('
var CLOSE_PARENTHESES = 41; // `)'
var OPEN_CURLY = 123; // `{'
var CLOSE_CURLY = 125; // `}'
var SEMICOLON = 59; // `;'
var ASTERICK = 42; // `*'
var COLON = 58; // `:'
var AT = 64; // `@'
var RE_AT_END = /[ \n\t\r\{\(\)'"\\;/]/g;
var RE_WORD_END = /[ \n\t\r\(\)\{\}:;@!'"\\]|\/(?=\*)/g;
var RE_BAD_BRACKET = /.[\\\/\("'\n]/;

function tokenize(input) {
    var tokens = [];
    var css = input.css.valueOf();

    var code = undefined,
        next = undefined,
        quote = undefined,
        lines = undefined,
        last = undefined,
        content = undefined,
        escape = undefined,
        nextLine = undefined,
        nextOffset = undefined,
        escaped = undefined,
        escapePos = undefined;

    var length = css.length;
    var offset = -1;
    var line = 1;
    var pos = 0;

    var unclosed = function unclosed(what, end) {
        if (input.safe) {
            css += end;
            next = css.length - 1;
        } else {
            throw input.error('Unclosed ' + what, line, pos - offset);
        }
    };

    while (pos < length) {
        code = css.charCodeAt(pos);

        if (code === NEWLINE) {
            offset = pos;
            line += 1;
        }

        switch (code) {
            case NEWLINE:
            case SPACE:
            case TAB:
            case CR:
            case FEED:
                next = pos;
                do {
                    next += 1;
                    code = css.charCodeAt(next);
                    if (code === NEWLINE) {
                        offset = next;
                        line += 1;
                    }
                } while (code === SPACE || code === NEWLINE || code === TAB || code === CR || code === FEED);

                tokens.push(['space', css.slice(pos, next)]);
                pos = next - 1;
                break;

            case OPEN_CURLY:
                tokens.push(['{', '{', line, pos - offset]);
                break;

            case CLOSE_CURLY:
                tokens.push(['}', '}', line, pos - offset]);
                break;

            case COLON:
                tokens.push([':', ':', line, pos - offset]);
                break;

            case SEMICOLON:
                tokens.push([';', ';', line, pos - offset]);
                break;

            case OPEN_PARENTHESES:
                next = css.indexOf(')', pos + 1);
                content = css.slice(pos, next + 1);

                if (next === -1 || RE_BAD_BRACKET.test(content)) {
                    tokens.push(['(', '(', line, pos - offset]);
                } else {
                    tokens.push(['brackets', content, line, pos - offset, line, next - offset]);
                    pos = next;
                }

                break;

            case CLOSE_PARENTHESES:
                tokens.push([')', ')', line, pos - offset]);
                break;

            case SINGLE_QUOTE:
            case DOUBLE_QUOTE:
                quote = code === SINGLE_QUOTE ? '\'' : '"';
                next = pos;
                do {
                    escaped = false;
                    next = css.indexOf(quote, next + 1);
                    if (next === -1) unclosed('quote', quote);
                    escapePos = next;
                    while (css.charCodeAt(escapePos - 1) === BACKSLASH) {
                        escapePos -= 1;
                        escaped = !escaped;
                    }
                } while (escaped);

                tokens.push(['string', css.slice(pos, next + 1), line, pos - offset, line, next - offset]);
                pos = next;
                break;

            case AT:
                RE_AT_END.lastIndex = pos + 1;
                RE_AT_END.test(css);
                if (RE_AT_END.lastIndex === 0) {
                    next = css.length - 1;
                } else {
                    next = RE_AT_END.lastIndex - 2;
                }
                tokens.push(['at-word', css.slice(pos, next + 1), line, pos - offset, line, next - offset]);
                pos = next;
                break;

            case BACKSLASH:
                next = pos;
                escape = true;
                while (css.charCodeAt(next + 1) === BACKSLASH) {
                    next += 1;
                    escape = !escape;
                }
                code = css.charCodeAt(next + 1);
                if (escape && (code !== SLASH && code !== SPACE && code !== NEWLINE && code !== TAB && code !== CR && code !== FEED)) {
                    next += 1;
                }
                tokens.push(['word', css.slice(pos, next + 1), line, pos - offset, line, next - offset]);
                pos = next;
                break;

            default:
                if (code === SLASH && css.charCodeAt(pos + 1) === ASTERICK) {
                    next = css.indexOf('*/', pos + 2) + 1;
                    if (next === 0) unclosed('comment', '*/');

                    content = css.slice(pos, next + 1);
                    lines = content.split('\n');
                    last = lines.length - 1;

                    if (last > 0) {
                        nextLine = line + last;
                        nextOffset = next - lines[last].length;
                    } else {
                        nextLine = line;
                        nextOffset = offset;
                    }

                    tokens.push(['comment', content, line, pos - offset, nextLine, next - nextOffset]);

                    offset = nextOffset;
                    line = nextLine;
                    pos = next;
                } else {
                    RE_WORD_END.lastIndex = pos + 1;
                    RE_WORD_END.test(css);
                    if (RE_WORD_END.lastIndex === 0) {
                        next = css.length - 1;
                    } else {
                        next = RE_WORD_END.lastIndex - 2;
                    }

                    tokens.push(['word', css.slice(pos, next + 1), line, pos - offset, line, next - offset]);
                    pos = next;
                }

                break;
        }

        pos++;
    }

    return tokens;
}

module.exports = exports['default'];