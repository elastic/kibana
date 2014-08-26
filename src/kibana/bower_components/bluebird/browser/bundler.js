var fs = require("fs");
function js(v){
    return /\.js/i.test(v) && !(/generator/i.test(v));
}

function toReq( v ) {
    return "require('" + v + "')";
}

function toReqFn( v ) {
    return "{fn: function(){ return require('" + v + "');}, name: '" + v + "'}";
}

function buster(v) {
    return "../test/" + v;
}

function mocha(v){
    return "../test/mocha/" + v
}

function write(str){
    fs.writeFileSync( "./main.js", str, {encoding: 'utf8'});
}


var mochaTests =  fs.readdirSync("../test/mocha").filter(js).map(mocha);

var code = "(" + (function(){
    var global = window;
    global.adapter = Promise;
    global.sinon = require("sinon");
    global.assert = require("assert");
    global.setImmediate = function(fn){
        setTimeout(fn, 0);
    };
}).toString() + ")();\n";


var all = "\n;window.tests = ["+mochaTests.map(toReqFn).join(",\n") + "];";

var promise = 'var Promise = require("../js/debug/bluebird.js");\nPromise.onPossiblyUnhandledRejection();';
write(promise + code + all);
