
/**
 * Module dependencies.
 */

var connect = require('../');

var blog = connect(
  connect.router(function(app){
    app.get('/', function(req, res){
      res.end('list blog posts. try /post/0');
    });

    app.get('/post/:id', function(req, res){
      res.end('got post ' + req.params.id);
    });
  })
);

var admin = connect(
    connect.basicAuth(function(user, pass){ return 'tj' == user && 'tobi' == pass })
  , function(req, res){
    res.end('admin stuff');
  }
);

connect()
  .use('/admin', admin)
  .use('/blog', blog)
  .use(function(req, res){
    res.end('try /blog, /admin, or /blog/post/0');
  })
  .listen(3000);