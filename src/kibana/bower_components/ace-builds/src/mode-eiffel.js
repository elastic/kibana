define("ace/mode/eiffel_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var EiffelHighlightRules = function() {
    var keywords = "across|agent|alias|all|attached|as|assign|attribute|check|" +
        "class|convert|create|debug|deferred|detachable|do|else|elseif|end|" +
        "ensure|expanded|export|external|feature|from|frozen|if|inherit|" +
        "inspect|invariant|like|local|loop|not|note|obsolete|old|once|" +
        "Precursor|redefine|rename|require|rescue|retry|select|separate|" + 
        "some|then|undefine|until|variant|when";

    var operatorKeywords = "and|implies|or|xor";

    var languageConstants = "Void";

    var booleanConstants = "True|False";

    var languageVariables = "Current|Result";

    var keywordMapper = this.createKeywordMapper({
        "constant.language": languageConstants,
        "constant.language.boolean": booleanConstants,
        "variable.language": languageVariables,
        "keyword.operator": operatorKeywords,
        "keyword": keywords
    }, "identifier", true);

    this.$rules = {
        "start": [{
                token : "comment.line.double-dash",
                regex : /--.*$/
            }, {
                token : "string.quoted.double",
                regex : /"(?:%"|[^%])*?"/
            }, {
                token : "string.quoted.other", // "[ ]" aligned verbatim string
                regex : /"\[/,
                next: "aligned_verbatim_string"
            }, {
                token : "string.quoted.other", // "{ }" non-aligned verbatim string
                regex : /"\{/,
                next: "non-aligned_verbatim_string"
            }, {
                token : "constant.character",
                regex : /'(?:%%|%T|%R|%N|%F|%'|[^%])'/
            }, {
                token : "constant.numeric", // real
                regex : /(?:\d(?:_?\d)*\.|\.\d)(?:\d*[eE][+-]?\d+)?\b/
            }, {
                token : "constant.numeric", // integer
                regex : /\d(?:_?\d)*\b/
            }, {
                token : "constant.numeric", // hex
                regex : /0[xX][a-fA-F\d](?:_?[a-fA-F\d])*\b/
            }, {
                token : "constant.numeric", // octal
                regex : /0[cC][0-7](?:_?[0-7])*\b/
            },{
                token : "constant.numeric", // bin
                regex : /0[bB][01](?:_?[01])*\b/
            }, {
                token : "keyword.operator",
                regex : /\+|\-|\*|\/|\\\\|\/\/|\^|~|\/~|<|>|<=|>=|\/=|=|:=|\|\.\.\||\.\./
            }, {
                token : "keyword.operator", // punctuation
                regex : /\.|:|,|;\b/
            }, {
                token : function (v) {
                    var result = keywordMapper (v);
                    if (result === "identifier" && v === v.toUpperCase ()) {
                        result =  "entity.name.type";
                    }
                    return result;
                },
                regex : /[a-zA-Z][a-zA-Z\d_]*\b/
            }, {
                token : "paren.lparen",
                regex : /[\[({]/
            }, {
                token : "paren.rparen",
                regex : /[\])}]/
            }, {
                token : "text",
                regex : /\s+/
            }
        ],
        "aligned_verbatim_string" : [{
                token : "string", // closing multi-line comment
                regex : /]"/,
                next : "start"
            }, {
                token : "string", // comment spanning whole line
                regex : /[^(?:\]")]+/
            }
        ],
        "non-aligned_verbatim_string" : [{
                token : "string.quoted.other", // closing multi-line comment
                regex : /}"/,
                next : "start"
            }, {
                token : "string.quoted.other", // comment spanning whole line
                regex : /[^(?:\}")]+/
            }
        ]};
};

oop.inherits(EiffelHighlightRules, TextHighlightRules);

exports.EiffelHighlightRules = EiffelHighlightRules;
});

define("ace/mode/eiffel",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/eiffel_highlight_rules","ace/range"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var EiffelHighlightRules = require("./eiffel_highlight_rules").EiffelHighlightRules;
var Range = require("../range").Range;

var Mode = function() {
    this.HighlightRules = EiffelHighlightRules;
};
oop.inherits(Mode, TextMode);

(function() {
    this.lineCommentStart = "--";
    this.$id = "ace/mode/eiffel";
}).call(Mode.prototype);

exports.Mode = Mode;

});
