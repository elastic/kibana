var should = require("should");

var fs = require("fs");
var path = require("path");

var runLoader = require("./fakeModuleSystem");
var jadeLoader = require("../");

var fixtures = path.join(__dirname, "fixtures");

describe("include", function() {
	it("should generate correct code", function(done) {
		var template = path.join(fixtures, "include", "template.jade");
		runLoader(jadeLoader, path.join(fixtures, "include"), template, fs.readFileSync(template, "utf-8"), function(err, result) {
			if(err) throw err;
			
			result.should.have.type("string");
			result.should.match(/"test"/);
			result.should.match(/"a"/);
			result.should.not.match(/"b"/);
			result.should.match(/"c"/);
			result.should.match(/jade_mixins\["test"\]/);
			result.should.match(/jade_mixins\["teest"\]/);
			
			done();
		});
	});
});