/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// uses https://www.npmjs.com/package/phantomjs-prebuilt
// run: phantomjs phantom-server.js

// https://gist.github.com/tompng/6433480
const server = require('webserver').create();
const webpage = require('webpage');
const fs = require('fs');

const port = 8080;

const CSS = fs.read('../../node_modules/@elastic/eui/dist/eui_theme_k6_light.css', 'utf8');

server.listen(port, function (request, response) {
  const queryIndex = request.url.indexOf("?");
  var params = {};
  if (queryIndex >= 0) {
    var queries = request.url.substr(queryIndex + 1).split('&');
    for (var i = 0; i < queries.length; i++) {
      try {
        var match = queries[i].match(/([^=]*)=(.*)/);
        params[match[1]] = decodeURIComponent(match[2]);
      } catch (e) { }
    }
  }
  if (true) {
    queue.push({ response: response, html: request.post });
    consumeCapture();
  } else {
    response.statusCode = 404;
    response.write('404 not found');
    response.close();
  }
});

console.log('running on port: ', port);

var queue = [];
var NUM_PAGES = 10;
var pages = NUM_PAGES;

function consumeCapture() {
  while (queue.length && pages > 0) {
    pages--;
    capture(queue.shift());
  }
}

function capture(data) {
  data.selector = '.content';

  console.log('start', data.selector);

  var page = webpage.create();

  // https://stackoverflow.com/a/11771464/2266116
  page.content = '<html><head><style>' + CSS + '</style></head><body style="width: 800px;"><div class="content" style="padding: 20px; display: inline-block">' + data.html + '</div></body></html>';

  var originalRect = { left: 0, top: 0, width: 500, height: 500 };

  var rect = page.evaluate(function (data) {
    var element = document.querySelector(data.selector);
    if (element) return element.getClientRects()[0];
  }, data);
  console.log('rect', JSON.stringify(rect));

  page.clipRect = rect || originalRect;

  data.response.statusCode = 200;
  data.response.setHeader('Content-Type', 'image/png');
  data.response.setEncoding('binary');
  data.response.write(atob(page.renderBase64()));
  data.response.close();
  console.log('render done');
  page.release();
  pages++;
  consumeCapture();

}
