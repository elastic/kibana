ace.define("ace/mode/scheme_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var SchemeHighlightRules = function() {
    var keywordControl = "case|do|let|loop|if|else|when";
    var keywordOperator = "eq?|eqv?|equal?|and|or|not|null?";
    var constantLanguage = "#t|#f";
    var supportFunctions = "cons|car|cdr|cond|lambda|lambda*|syntax-rules|format|set!|quote|eval|append|list|list?|member?|load";

    var keywordMapper = this.createKeywordMapper({
        "keyword.control": keywordControl,
        "keyword.operator": keywordOperator,
        "constant.language": constantLanguage,
        "support.function": supportFunctions
    }, "identifier", true);

    this.$rules = 
        {
    "start": [
        {
            token : "comment",
            regex : ";.*$"
        },
        {
            "token": ["storage.type.function-type.scheme", "text", "entity.name.function.scheme"],
            "regex": "(?:\\b(?:(define|define-syntax|define-macro))\\b)(\\s+)((?:\\w|\\-|\\!|\\?)*)"
        },
        {
            "token": "punctuation.definition.constant.character.scheme",
            "regex": "#:\\S+"
        },
        {
            "token": ["punctuation.definition.variable.scheme", "variable.other.global.scheme", "punctuation.definition.variable.scheme"],
            "regex": "(\\*)(\\S*)(\\*)"
        },
        {
            "token" : "constant.numeric", // hex
            "regex" : "#[xXoObB][0-9a-fA-F]+"
        }, 
        {
            "token" : "constant.numeric", // float
            "regex" : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?"
        },
        {
                "token" : keywordMapper,
                "regex" : "[a-zA-Z_#][a-zA-Z0-9_\\-\\?\\!\\*]*"
        },
        {
            "token" : "string",
            "regex" : '"(?=.)',
            "next"  : "qqstring"
        }
    ],
    "qqstring": [
        {
            "token": "constant.character.escape.scheme",
            "regex": "\\\\."
        },
        {
            "token" : "string",
            "regex" : '[^"\\\\]+',
            "merge" : true
        }, {
            "token" : "string",
            "regex" : "\\\\$",
            "next"  : "qqstring",
            "merge" : true
        }, {
            "token" : "string",
            "regex" : '"|$',
            "next"  : "start",
            "merge" : true
        }
    ]
}

};

oop.inherits(SchemeHighlightRules, TextHighlightRules);

exports.SchemeHighlightRules = SchemeHighlightRules;
});

ace.define("ace/mode/scheme",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/scheme_highlight_rules"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var SchemeHighlightRules = require("./scheme_highlight_rules").SchemeHighlightRules;

var Mode = function() {
    this.HighlightRules = SchemeHighlightRules;
};
oop.inherits(Mode, TextMode);

(function() {
       
    this.lineCommentStart = ";";
    
    this.$id = "ace/mode/scheme";
}).call(Mode.prototype);

exports.Mode = Mode;
});
