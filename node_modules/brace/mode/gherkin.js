ace.define("ace/mode/gherkin_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(acequire, exports, module) {

var oop = acequire("../lib/oop");
var TextHighlightRules = acequire("./text_highlight_rules").TextHighlightRules;
var stringEscape =  "\\\\(x[0-9A-Fa-f]{2}|[0-7]{3}|[\\\\abfnrtv'\"]|U[0-9A-Fa-f]{8}|u[0-9A-Fa-f]{4})";

var GherkinHighlightRules = function() {
    this.$rules = {
    	start : [{
            token: 'constant.numeric',
            regex: "(?:(?:[1-9]\\d*)|(?:0))"
 		}, {
    		token : "comment",
    		regex : "#.*$"
    	}, {
    		token : "keyword",
    		regex : "Feature:|Background:|Scenario:|Scenario\ Outline:|Examples:|Given|When|Then|And|But|\\*",
    	}, {
            token : "string",           // multi line """ string start
            regex : '"{3}',
            next : "qqstring3"
        }, {
            token : "string",           // " string
            regex : '"',
            next : "qqstring"
        }, {
        	token : "comment",
        	regex : "@[A-Za-z0-9]+",
        	next : "start"
        }, {
        	token : "comment",
        	regex : "<.+>"
        }, {
        	token : "comment",
        	regex : "\\| ",
        	next : "table-item"
        }, {
        	token : "comment",
        	regex : "\\|$",
        	next : "start"
        }],
    	"qqstring3" : [ {
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string", // multi line """ string end
            regex : '"{3}',
            next : "start"
        }, {
            defaultToken : "string"
        }],
    	"qqstring" : [{
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string",
            regex : "\\\\$",
            next  : "qqstring"
        }, {
            token : "string",
            regex : '"|$',
            next  : "start"
        }, {
            defaultToken: "string"
        }],
        "table-item" : [{
            token : "string",
            regex : "[A-Za-z0-9 ]*",
            next  : "start"
        }],
    };
    
}

oop.inherits(GherkinHighlightRules, TextHighlightRules);

exports.GherkinHighlightRules = GherkinHighlightRules;
});

ace.define("ace/mode/gherkin",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/gherkin_highlight_rules"], function(acequire, exports, module) {

var oop = acequire("../lib/oop");
var TextMode = acequire("./text").Mode;
var GherkinHighlightRules = acequire("./gherkin_highlight_rules").GherkinHighlightRules;

var Mode = function() {
    this.HighlightRules = GherkinHighlightRules;
};
oop.inherits(Mode, TextMode);

(function() {
    this.lineCommentStart = "#";
    this.$id = "ace/mode/gherkin";

    this.getNextLineIndent = function(state, line, tab) {
        var indent = this.$getIndent(line);
        var space2 = "  ";

        var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;
        
        console.log(state)
        
        if(line.match("[ ]*\\|")) {
            indent += "| ";
        }

        if (tokens.length && tokens[tokens.length-1].type == "comment") {
            return indent;
        }
        

        if (state == "start") {
            if (line.match("Scenario:|Feature:|Scenario\ Outline:|Background:")) {
                indent += space2;
            } else if(line.match("(Given|Then).+(:)$|Examples:")) {
            	indent += space2;
            } else if(line.match("\\*.+")) {
            	indent += "* ";
            } 
        }
        

        return indent;
    };
}).call(Mode.prototype);

exports.Mode = Mode;
});
