var fs = require('fs');
var path = require('path');
var assert = require('assert');

var marked = require('marked');

var renderer = require('../');


var CONTENT = fs.readFileSync(path.join(__dirname, './fixtures/PAGE.md'), 'utf8');
var LEXED = marked.lexer(CONTENT);

// Options to parser
var options = Object.create(marked.defaults);
options.renderer = renderer();

var RENDERED = marked.parser(LEXED, options);


describe('Text renderer', function() {
    it('should strip all html tags', function() {
        assert.equal(RENDERED.indexOf('</'), -1);
        console.log(RENDERED);
    });
});
