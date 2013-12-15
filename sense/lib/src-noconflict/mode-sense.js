ace.define('ace/mode/sense', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text', 'ace/tokenizer', 'ace/mode/sense_json_highlight_rules', 'ace/mode/matching_brace_outdent', 'ace/mode/behaviour/cstyle', 'ace/mode/folding/cstyle', 'ace/worker/worker_client'], function (require, exports, module) {


    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var HighlightRules = require("./sense_json_highlight_rules").SenseJsonHighlightRules;
    var MatchingBraceOutdent = require("./matching_brace_outdent").MatchingBraceOutdent;
    var CstyleBehaviour = require("./behaviour/cstyle").CstyleBehaviour;
    var CStyleFoldMode = require("./folding/cstyle").FoldMode;
    var WorkerClient = require("../worker/worker_client").WorkerClient;


    var Tokenizer = function (rules, flag) {
        this.constructor(rules, flag);
    };


    (function () {
        this.constructor = require("../tokenizer").Tokenizer;
        this.prototype = this.constructor.prototype;
        this.getLineTokens = function (line, startState) {
            var currentState;
            if (!startState) {
                currentState = { name: "start"};
            } else if (typeof startState === "string") {
                currentState = { name: startState };
            }
            else {
                currentState = startState;
            }

            var state = this.rules[currentState.name];
            var mapping = this.matchMappings[currentState.name];
            var re = this.regExps[currentState.name];
            re.lastIndex = 0;

            var match, tokens = [];

            var lastIndex = 0;

            var token = {
                type: null,
                value: ""
            };

            while (match = re.exec(line)) {
                var type = "text";
                var rule = null;
                var value = [match[0]];

                for (var i = 0; i < match.length - 2; i++) {
                    if (match[i + 1] === undefined)
                        continue;

                    rule = state[mapping[i].rule];

                    if (mapping[i].len > 1)
                        value = match.slice(i + 2, i + 1 + mapping[i].len);
                    if (typeof rule.token == "function")
                        type = rule.token.apply(this, value);
                    else
                        type = rule.token;

                    var next = rule.next;
                    if (typeof next == "function") {
                        next = next.call(this, currentState, type, value);
                    }
                    if (typeof next == "string") next = { name: next };

                    if (next) {
                        currentState = next;
                        state = this.rules[currentState.name];
                        mapping = this.matchMappings[currentState.name];
                        lastIndex = re.lastIndex;

                        re = this.regExps[currentState.name];

                        if (re === undefined) {
                            throw new Error("You indicated a state of " + next + " to go to, but it doesn't exist!");
                        }

                        re.lastIndex = lastIndex;
                    }
                    break;
                }

                if (value[0]) {
                    if (typeof type == "string") {
                        value = [value.join("")];
                        type = [type];
                    }
                    for (var i = 0; i < value.length; i++) {
                        if (!value[i])
                            continue;

                        if ((!rule || rule.merge || type[i] === "text") && token.type === type[i]) {
                            token.value += value[i];
                        } else {
                            if (token.type)
                                tokens.push(token);

                            token = {
                                type: type[i],
                                value: value[i]
                            };
                        }
                    }
                }

                if (lastIndex == line.length)
                    break;

                lastIndex = re.lastIndex;
            }

            if (token.type)
                tokens.push(token);

            return {
                tokens: tokens,
                state: currentState
            };

        };

        return this;

    }).call(Tokenizer.prototype);


    var Mode = function () {
        this.$tokenizer = new Tokenizer(new HighlightRules().getRules());
        this.$outdent = new MatchingBraceOutdent();
        this.$behaviour = new CstyleBehaviour();
        this.foldingRules = new CStyleFoldMode();
    };
    oop.inherits(Mode, TextMode);

    (function () {

        this.getNextLineIndent = function (state, line, tab) {
            var indent = this.$getIndent(line);

            if (state != "double_q_string") {
                var match = line.match(/^.*[\{\(\[]\s*$/);
                if (match) {
                    indent += tab;
                }
            }

            return indent;
        };

        this.checkOutdent = function (state, line, input) {
            return this.$outdent.checkOutdent(line, input);
        };

        this.autoOutdent = function (state, doc, row) {
            this.$outdent.autoOutdent(doc, row);
        };

        this.createWorker = function (session) {
            var worker = new WorkerClient(["ace"], "ace/mode/sense_worker", "SenseWorker");
            worker.attachToDocument(session.getDocument());


            worker.on("error", function (e) {
                session.setAnnotations([e.data]);
            });

            worker.on("ok", function (anno) {
                session.setAnnotations(anno.data);
            });

            return worker;
        };


    }).call(Mode.prototype);

    exports.Mode = Mode;
});

ace.define('ace/mode/sense_json_highlight_rules', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function (require, exports, module) {


    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var SenseJsonHighlightRules = function () {

        function mergeTokens(/* ... */) {
            return [].concat.apply([], arguments);
        }

        function addEOL(tokens, reg, nextIfEOL, normalNext) {
            if (typeof reg == "object") reg = reg.source;
            return [
                { token: tokens.concat(["whitespace"]), regex: reg + "(\\s*)$", next: nextIfEOL },
                { token: tokens, regex: reg, next: normalNext }
            ];
        }

        function scopeIncrement(next) {
            return function (state) {
                state = { name: next, depth: state.depth };
                if (!state.depth) {
                    state.depth = 1;
                }
                else {
                    state.depth++;
                }
                return state;
            }
        }

        function scopeDecrement(next, nextIfZero) {
            return function (state) {
                state = { name: state.name, depth: state.depth };
                if (!state.depth) {
                    state.name = next;
                }
                else {
                    state.depth--;
                    state.name = state.depth == 0 ? nextIfZero : next;
                }
                return state;
            };
        }


        // regexp must not have capturing parentheses. Use (?:) instead.
        // regexps are ordered -> the first match is used
        this.$rules = {
            "start": mergeTokens([
                { token: "comment", regex: /^#.*$/},
                { token: "paren.lparen", regex: "{", next: scopeIncrement("json") },
            ],
                addEOL(["method"], /([a-zA-Z]+)/, "start", "method_sep")
                ,
                [
                    {
                        token: "whitespace",
                        regex: "\\s+"
                    },
                    {
                        token: "text",
                        regex: ".+?"
                    }
                ]),
            "method_sep": mergeTokens(
                addEOL(["whitespace", "url.slash"], /(\s+)(\/)/, "start", "indices"),
                addEOL(["whitespace"], /(\s+)/, "start", "indices")
            ),
            "indices": mergeTokens(
                addEOL(["url.scheme", "url.host", "url.slash"], /([^:]+:\/\/)([^?\/\s]*)(\/?)/, "start"),
                addEOL(["url.index"], /(_all)/, "start"),
                addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
                addEOL(["url.index"], /([^\/?,]+)/, "start"),
                addEOL(["url.comma"], /(,)/, "start"),
                addEOL(["url.slash"], /(\/)/, "start", "types"),
                addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
            ),
            "types": mergeTokens(
                addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
                addEOL(["url.type"], /([^\/?,]+)/, "start"),
                addEOL(["url.comma"], /(,)/, "start"),
                addEOL(["url.slash"], /(\/)/, "start", "id"),
                addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
            ),
            "id": mergeTokens(
                addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
                addEOL(["url.id"], /([^\/?]+)/, "start"),
                addEOL(["url.slash"], /(\/)/, "start", "urlRest"),
                addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
            ),
            "urlRest": mergeTokens(
                addEOL(["url.part"], /([^?\/]+)/, "start"),
                addEOL(["url.slash"], /(\/)/, "start"),
                addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
            ),
            "urlParams": mergeTokens(
                addEOL(["url.param", "url.equal", "url.value"], /([^&=]+)(=)([^&]*)/, "start"),
                addEOL(["url.param"], /([^&=]+)/, "start"),
                addEOL(["url.amp"], /(&)/, "start")
            ),


            "json": [
                {
                    token: "variable", // single line
                    regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)'
                },
                {
                    token: "string", // single line
                    regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
                },
                {
                    token: "constant.numeric", // hex
                    regex: "0[xX][0-9a-fA-F]+\\b"
                },
                {
                    token: "constant.numeric", // float
                    regex: "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
                },
                {
                    token: "constant.language.boolean",
                    regex: "(?:true|false)\\b"
                },
                {
                    token: "invalid.illegal", // single quoted strings are not allowed
                    regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
                },
                {
                    token: "invalid.illegal", // comments are not allowed
                    regex: "\\/\\/.*$"
                },
                {
                    token: "paren.lparen",
                    regex: "{",
                    next: scopeIncrement("json")
                },
                {
                    token: "paren.lparen",
                    regex: "[[(]"
                },
                {
                    token: "paren.rparen",
                    regex: "[\\])]"
                },
                {
                    token: "paren.rparen",
                    regex: "}",
                    next: scopeDecrement("json", "start")
                },
                {
                    token: "punctuation.comma",
                    regex: ","
                },
                {
                    token: "punctuation.colon",
                    regex: ":"
                },
                {
                    token: "whitespace",
                    regex: "\\s+"
                },
                {
                    token: "text",
                    regex: ".+?"
                }
            ],
            "double_q_string": [
                {
                    token: "string",
                    regex: '[^"]+'
                },
                {
                    token: "punctuation.end_quote",
                    regex: '"',
                    next: "json"
                },
                {
                    token: "string",
                    regex: "",
                    next: "json"
                }
            ]
        }
    };

    oop.inherits(SenseJsonHighlightRules, TextHighlightRules);

    exports.SenseJsonHighlightRules = SenseJsonHighlightRules;

});

ace.define('ace/mode/matching_brace_outdent', ['require', 'exports', 'module' , 'ace/range'], function (require, exports, module) {


    var Range = require("../range").Range;

    var MatchingBraceOutdent = function () {
    };

    (function () {

        this.checkOutdent = function (line, input) {
            if (!/^\s+$/.test(line))
                return false;

            return /^\s*\}/.test(input);
        };

        this.autoOutdent = function (doc, row) {
            var line = doc.getLine(row);
            var match = line.match(/^(\s*\})/);

            if (!match) return 0;

            var column = match[1].length;
            var openBracePos = doc.findMatchingBracket({row: row, column: column});

            if (!openBracePos || openBracePos.row == row) return 0;

            var indent = this.$getIndent(doc.getLine(openBracePos.row));
            doc.replace(new Range(row, 0, row, column - 1), indent);
        };

        this.$getIndent = function (line) {
            var match = line.match(/^(\s+)/);
            if (match) {
                return match[1];
            }

            return "";
        };

    }).call(MatchingBraceOutdent.prototype);

    exports.MatchingBraceOutdent = MatchingBraceOutdent;
});

ace.define('ace/mode/behaviour/cstyle', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/behaviour', 'ace/token_iterator'], function (require, exports, module) {


    var oop = require("../../lib/oop");
    var Behaviour = require("../behaviour").Behaviour;
    var TokenIterator = require("../../token_iterator").TokenIterator;

    var autoInsertedBrackets = 0;
    var autoInsertedRow = -1;
    var autoInsertedLineEnd = "";

    var CstyleBehaviour = function () {

        CstyleBehaviour.isSaneInsertion = function (editor, session) {
            var cursor = editor.getCursorPosition();
            var iterator = new TokenIterator(session, cursor.row, cursor.column);
            if (!this.$matchTokenType(iterator.getCurrentToken() || "text", ["text", "paren.rparen"])) {
                iterator = new TokenIterator(session, cursor.row, cursor.column + 1);
                if (!this.$matchTokenType(iterator.getCurrentToken() || "text", ["text", "paren.rparen"]))
                    return false;
            }
            iterator.stepForward();
            return iterator.getCurrentTokenRow() !== cursor.row ||
                this.$matchTokenType(iterator.getCurrentToken() || "text", ["text", "comment", "paren.rparen"]);
        };

        CstyleBehaviour.$matchTokenType = function (token, types) {
            return types.indexOf(token.type || token) > -1;
        };

        CstyleBehaviour.recordAutoInsert = function (editor, session, bracket) {
            var cursor = editor.getCursorPosition();
            var line = session.doc.getLine(cursor.row);
            if (!this.isAutoInsertedClosing(cursor, line, autoInsertedLineEnd[0]))
                autoInsertedBrackets = 0;
            autoInsertedRow = cursor.row;
            autoInsertedLineEnd = bracket + line.substr(cursor.column);
            autoInsertedBrackets++;
        };

        CstyleBehaviour.isAutoInsertedClosing = function (cursor, line, bracket) {
            return autoInsertedBrackets > 0 &&
                cursor.row === autoInsertedRow &&
                bracket === autoInsertedLineEnd[0] &&
                line.substr(cursor.column) === autoInsertedLineEnd;
        };

        CstyleBehaviour.popAutoInsertedClosing = function () {
            autoInsertedLineEnd = autoInsertedLineEnd.substr(1);
            autoInsertedBrackets--;
        };

        this.add("braces", "insertion", function (state, action, editor, session, text) {
            if (text == '{') {
                var selection = editor.getSelectionRange();
                var selected = session.doc.getTextRange(selection);
                if (selected !== "" && selected !== "{") {
                    return {
                        text: '{' + selected + '}',
                        selection: false
                    };
                } else if (CstyleBehaviour.isSaneInsertion(editor, session)) {
                    CstyleBehaviour.recordAutoInsert(editor, session, "}");
                    return {
                        text: '{}',
                        selection: [1, 1]
                    };
                }
            } else if (text == '}') {
                var cursor = editor.getCursorPosition();
                var line = session.doc.getLine(cursor.row);
                var rightChar = line.substring(cursor.column, cursor.column + 1);
                if (rightChar == '}') {
                    var matching = session.$findOpeningBracket('}', {column: cursor.column + 1, row: cursor.row});
                    if (matching !== null && CstyleBehaviour.isAutoInsertedClosing(cursor, line, text)) {
                        CstyleBehaviour.popAutoInsertedClosing();
                        return {
                            text: '',
                            selection: [1, 1]
                        };
                    }
                }
            } else if (text == "\n" || text == "\r\n") {
                var cursor = editor.getCursorPosition();
                var line = session.doc.getLine(cursor.row);
                var rightChar = line.substring(cursor.column, cursor.column + 1);
                if (rightChar == '}') {
                    var openBracePos = session.findMatchingBracket({row: cursor.row, column: cursor.column + 1});
                    if (!openBracePos)
                        return null;

                    var indent = this.getNextLineIndent(state, line.substring(0, line.length - 1), session.getTabString());
                    var next_indent = this.$getIndent(session.doc.getLine(openBracePos.row));

                    return {
                        text: '\n' + indent + '\n' + next_indent,
                        selection: [1, indent.length, 1, indent.length]
                    };
                }
            }
        });

        this.add("braces", "deletion", function (state, action, editor, session, range) {
            var selected = session.doc.getTextRange(range);
            if (!range.isMultiLine() && selected == '{') {
                var line = session.doc.getLine(range.start.row);
                var rightChar = line.substring(range.end.column, range.end.column + 1);
                if (rightChar == '}') {
                    range.end.column++;
                    return range;
                }
            }
        });

        this.add("parens", "insertion", function (state, action, editor, session, text) {
            if (text == '(') {
                var selection = editor.getSelectionRange();
                var selected = session.doc.getTextRange(selection);
                if (selected !== "") {
                    return {
                        text: '(' + selected + ')',
                        selection: false
                    };
                } else if (CstyleBehaviour.isSaneInsertion(editor, session)) {
                    CstyleBehaviour.recordAutoInsert(editor, session, ")");
                    return {
                        text: '()',
                        selection: [1, 1]
                    };
                }
            } else if (text == ')') {
                var cursor = editor.getCursorPosition();
                var line = session.doc.getLine(cursor.row);
                var rightChar = line.substring(cursor.column, cursor.column + 1);
                if (rightChar == ')') {
                    var matching = session.$findOpeningBracket(')', {column: cursor.column + 1, row: cursor.row});
                    if (matching !== null && CstyleBehaviour.isAutoInsertedClosing(cursor, line, text)) {
                        CstyleBehaviour.popAutoInsertedClosing();
                        return {
                            text: '',
                            selection: [1, 1]
                        };
                    }
                }
            }
        });

        this.add("parens", "deletion", function (state, action, editor, session, range) {
            var selected = session.doc.getTextRange(range);
            if (!range.isMultiLine() && selected == '(') {
                var line = session.doc.getLine(range.start.row);
                var rightChar = line.substring(range.start.column + 1, range.start.column + 2);
                if (rightChar == ')') {
                    range.end.column++;
                    return range;
                }
            }
        });

        this.add("brackets", "insertion", function (state, action, editor, session, text) {
            if (text == '[') {
                var selection = editor.getSelectionRange();
                var selected = session.doc.getTextRange(selection);
                if (selected !== "") {
                    return {
                        text: '[' + selected + ']',
                        selection: false
                    };
                } else if (CstyleBehaviour.isSaneInsertion(editor, session)) {
                    CstyleBehaviour.recordAutoInsert(editor, session, "]");
                    return {
                        text: '[]',
                        selection: [1, 1]
                    };
                }
            } else if (text == ']') {
                var cursor = editor.getCursorPosition();
                var line = session.doc.getLine(cursor.row);
                var rightChar = line.substring(cursor.column, cursor.column + 1);
                if (rightChar == ']') {
                    var matching = session.$findOpeningBracket(']', {column: cursor.column + 1, row: cursor.row});
                    if (matching !== null && CstyleBehaviour.isAutoInsertedClosing(cursor, line, text)) {
                        CstyleBehaviour.popAutoInsertedClosing();
                        return {
                            text: '',
                            selection: [1, 1]
                        };
                    }
                }
            }
        });

        this.add("brackets", "deletion", function (state, action, editor, session, range) {
            var selected = session.doc.getTextRange(range);
            if (!range.isMultiLine() && selected == '[') {
                var line = session.doc.getLine(range.start.row);
                var rightChar = line.substring(range.start.column + 1, range.start.column + 2);
                if (rightChar == ']') {
                    range.end.column++;
                    return range;
                }
            }
        });

        this.add("string_dquotes", "insertion", function (state, action, editor, session, text) {
            if (text == '"' || text == "'") {
                var quote = text;
                var selection = editor.getSelectionRange();
                var selected = session.doc.getTextRange(selection);
                if (selected !== "") {
                    return {
                        text: quote + selected + quote,
                        selection: false
                    };
                } else {
                    var cursor = editor.getCursorPosition();
                    var line = session.doc.getLine(cursor.row);
                    var leftChar = line.substring(cursor.column - 1, cursor.column);
                    if (leftChar == '\\') {
                        return null;
                    }
                    var tokens = session.getTokens(selection.start.row);
                    var col = 0, token;
                    var quotepos = -1; // Track whether we're inside an open quote.

                    for (var x = 0; x < tokens.length; x++) {
                        token = tokens[x];
                        if (token.type == "string") {
                            quotepos = -1;
                        } else if (quotepos < 0) {
                            quotepos = token.value.indexOf(quote);
                        }
                        if ((token.value.length + col) > selection.start.column) {
                            break;
                        }
                        col += tokens[x].value.length;
                    }
                    if (!token || (quotepos < 0 && token.type !== "comment" && (token.type !== "string" || ((selection.start.column !== token.value.length + col - 1) && token.value.lastIndexOf(quote) === token.value.length - 1)))) {
                        return {
                            text: quote + quote,
                            selection: [1, 1]
                        };
                    } else if (token && token.type === "string") {
                        var rightChar = line.substring(cursor.column, cursor.column + 1);
                        if (rightChar == quote) {
                            return {
                                text: '',
                                selection: [1, 1]
                            };
                        }
                    }
                }
            }
        });

        this.add("string_dquotes", "deletion", function (state, action, editor, session, range) {
            var selected = session.doc.getTextRange(range);
            if (!range.isMultiLine() && (selected == '"' || selected == "'")) {
                var line = session.doc.getLine(range.start.row);
                var rightChar = line.substring(range.start.column + 1, range.start.column + 2);
                if (rightChar == '"') {
                    range.end.column++;
                    return range;
                }
            }
        });

    };

    oop.inherits(CstyleBehaviour, Behaviour);

    exports.CstyleBehaviour = CstyleBehaviour;
});

ace.define('ace/mode/folding/cstyle', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/range', 'ace/mode/folding/fold_mode'], function (require, exports, module) {


    var oop = require("../../lib/oop");
    var Range = require("../../range").Range;
    var BaseFoldMode = require("./fold_mode").FoldMode;

    var FoldMode = exports.FoldMode = function () {
    };
    oop.inherits(FoldMode, BaseFoldMode);

    (function () {

        this.foldingStartMarker = /(\{|\[)[^\}\]]*$|^\s*(\/\*)/;
        this.foldingStopMarker = /^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/;

        this.getFoldWidgetRange = function (session, foldStyle, row) {
            var line = session.getLine(row);
            var match = line.match(this.foldingStartMarker);
            if (match) {
                var i = match.index;

                if (match[1])
                    return this.openingBracketBlock(session, match[1], row, i);

                return session.getCommentFoldRange(row, i + match[0].length, 1);
            }

            if (foldStyle !== "markbeginend")
                return;

            var match = line.match(this.foldingStopMarker);
            if (match) {
                var i = match.index + match[0].length;

                if (match[1])
                    return this.closingBracketBlock(session, match[1], row, i);

                return session.getCommentFoldRange(row, i, -1);
            }
        };

    }).call(FoldMode.prototype);

});
