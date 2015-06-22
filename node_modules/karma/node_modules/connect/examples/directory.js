
/**
 * Module dependencies.
 */

var connect = require('../');
var app = connect();
var path = __dirname + '/../';

app.use(connect.directory(path, { icons: true }))
app.use(connect.static(path))
app.listen(3000);
