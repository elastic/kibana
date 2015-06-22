
/**
 * Module dependencies.
 */

var connect = require('../');

connect()
  .use(connect.bodyParser())
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
  req.files.images.forEach(function(file){
    console.log('  uploaded : %s %skb : %s', file.originalFilename, file.size / 1024 | 0, file.path);
  });
  res.end('Thanks');
}