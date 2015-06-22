var grunt = require('grunt');
var fs = require('fs');


exports.textReplace = {
  'Test replace tasks in grunt file produced the correct result': function (test) {
    var modifiedFile = grunt.file.read('test/modified/example.txt');
    var expectedResult = grunt.file.read('test/text_files/expected-result.txt');
    test.equal(modifiedFile, expectedResult);
    test.done();
  },

  'Test "processTemplates: false" correctly disables grunt.template processing in function return statements': function (test) {
    var modifiedFile = grunt.file.read('test/modified/template-example.txt');
    var expectedResult = grunt.file.read('test/text_files/template-expected-result.txt');
    test.equal(modifiedFile, expectedResult);
    test.done();
  }
};
