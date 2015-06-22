
var connect = require('../')
  , http = require('http');

// try:
//   - viewing in a browser
//   - curl http://localhost:3000
//   - curl -H "Accept: application/json" http://localhost:3000

var app = connect()
  .use(function(req, res, next){
    var err = new Error('oh noes!');
    err.number = 7;
    throw err;
  })
  .use(connect.errorHandler());

http.Server(app).listen(3000);
console.log('Server started on port 3000');
