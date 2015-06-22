
/**
 * Module dependencies.
 */

var connect = require('../');

// $ curl http://localhost:3000/

// custom format string

connect.createServer(
    connect.logger(':method :url - :res[content-type]')
  , function(req, res){
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
).listen(3000);

// $ curl http://localhost:3001/
// $ curl http://localhost:3001/302
// $ curl http://localhost:3001/404
// $ curl http://localhost:3001/500

connect()
  .use(connect.logger('dev'))
  .use('/connect', connect.static(__dirname + '/lib'))
  .use('/connect', connect.directory(__dirname + '/lib'))
  .use(function(req, res, next){
    switch (req.url) {
      case '/500':
        var body = 'Internal Server Error';
        res.statusCode = 500;
        res.setHeader('Content-Length', body.length);
        res.end(body);
        break;
      case '/404':
        var body = 'Not Found';
        res.statusCode = 404;
        res.setHeader('Content-Length', body.length);
        res.end(body);
        break;
      case '/302':
        var body = 'Found';
        res.statusCode = 302;
        res.setHeader('Content-Length', body.length);
        res.end(body);
        break;
      default:
        var body = 'OK';
        res.setHeader('Content-Length', body.length);
        res.end(body);
    }
  })
  .listen(3001);

// pre-defined

connect()
  .use(connect.logger('short'))
  .listen(3002);