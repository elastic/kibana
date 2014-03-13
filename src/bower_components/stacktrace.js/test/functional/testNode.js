/*global require, console*/
var ExceptionLab = require("./ExceptionLab");
var printStackTrace = require("../../stacktrace");

var lastException;

function info(text) {
    console.log(text);
}

function dumpStacktrace(guess) {
    var trace = printStackTrace({
        e: lastException,
        guess: guess
    });
    info(trace.join("\n"));
}

function dumpException(ex) {
    var text = "{\n  " + ExceptionLab.getExceptionProps(ex).join(",\n  ") + "\n}";
    info(text);
    //info(ex.arguments);
    lastException = ex;
}

function dumpExceptionMultiLine() {
    var fn = function() {
        return {
            name: "provide multi-line message in exception"
        };
    };
    try {
        fn.nonExistentMethod();
    } catch (ex) {
        dumpException(ex);
    }
}

info("Exception properties:");
dumpExceptionMultiLine();

var p = new printStackTrace.implementation();
info("\nException mode: " + p.mode(lastException));

info("\nException stack trace:");
dumpStacktrace();
