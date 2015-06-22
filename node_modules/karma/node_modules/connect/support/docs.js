
var fs = require('fs')
  , jade = require('jade');

var tmpl = fs.readFileSync('support/docs.jade', 'utf8');
var fn = jade.compile(tmpl);

var json = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk){
  json += chunk;
}).on('end', function(){
  json = JSON.parse(json);
  render(json);
}).resume();

function title(comment) {
  if (!comment.ctx) return '';
  if (~comment.ctx.string.indexOf('module.exports')) return '';
  if (~comment.ctx.string.indexOf('prototype')) {
    return comment.ctx.string.replace('.prototype.', '#');
  } else {
    return comment.ctx.string;
  }
}

function id(comment) {
  if (!comment.ctx) return '';
  return comment.ctx.string
    .replace('()', '');
}

function ignore(comment) {
  return comment.ignore
    || (comment.ctx && ~comment.ctx.string.indexOf('__proto__'))
    || ~comment.description.full.indexOf('Module dependencies');
}

function render(obj) {
  process.stdout.write(fn({
      comments: obj
    , ignore: ignore
    , title: title
    , id: id
  }));
}