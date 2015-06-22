
/**
 * Module dependencies.
 */

var connect = require('../');
var fs = require('fs');

connect()
  .use(connect.bodyParser({ defer: true }))
  .use(form)
  .use(upload)
  .listen(3000);

function form(req, res, next) {
  if ('GET' !== req.method) return next();
  res.setHeader('Content-Type', 'text/html');
  res.end('<form method="post" enctype="multipart/form-data">'
    + '<input type="file" name="images" multiple="multiple" />'
    + '<input type="submit" value="Upload" />'
    + '</form>');
}

function upload(req, res, next) {
  if ('POST' !== req.method) return next();

  req.form.on('part', function(part){
    // transfer to s3 etc
    console.log('upload %s %s', part.name, part.filename);
    var out = fs.createWriteStream('/tmp/' + part.filename);
    part.pipe(out);
  });

  req.form.on('close', function(){
    res.end('uploaded!');
  });
}