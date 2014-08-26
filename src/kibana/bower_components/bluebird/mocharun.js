var file = process.argv[2];

global.adapter = require("./js/debug/bluebird.js");

var Mocha = require("mocha");
var mochaOpts = {
    reporter: "spec",
    timeout: 500, //200 caused non-deterministic test failures
            //when a test uses timeouts just barely under 200 ms
    slow: Infinity
};

var mocha = new Mocha(mochaOpts);
mocha.addFile(process.argv[2]);
mocha.run(function(err){

}).on( "fail", function( test, err ) {
    process.stderr.write(test.title + "\n" + err.stack + "\n");
    process.exit(-1);
});
