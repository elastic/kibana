
var connect = require('../')
  , http = require('http');

// visit form.html

var app = connect()
  .use(connect.static(__dirname + '/public'))
  .use(connect.bodyParser())
  .use(form)
  .use(upload);

function form(req, res, next){
  if ('GET' != req.method) return next();
  res.statusCode = 302;
  res.setHeader('Location', 'form.html');
  res.end();
}

function upload(req, res){
  res.setHeader('Content-Type', 'text/html');
  res.write('<p>thanks ' + req.body.name + '</p>');
  res.write('<ul>');

  if (Array.isArray(req.files.images)) {
    req.files.images.forEach(function(image){
      var kb = image.size / 1024 | 0;
      res.write('<li>uploaded ' + image.name + ' ' + kb + 'kb</li>');
    });
  } else {
    var image = req.files.images;
    var kb = image.size / 1024 | 0;
    res.write('<li>uploaded ' + image.name + ' ' + kb + 'kb</li>');
  }

  res.end('</ul>');
}

http.Server(app).listen(3000);
console.log('Server started on port 3000');