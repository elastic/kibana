"use strict";

/**
 * Test Server
 */

var app   = require('./app');

module.exports = app.listen(app.get('port'));
