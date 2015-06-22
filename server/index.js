var express = require('../node_modules/express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());


require('./routes/series')(app);

var dir = __dirname + '/../app';

app.use('/', express.static(dir));

var server = app.listen(3000, function () {
  console.log(dir);

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example foo listening at http://%s:%s', host, port);

});
