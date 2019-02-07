/*
  Uses phantomjs for this PoC
*/

// eslint-disable-next-line import/no-unresolved
const server = require('webserver').create();
// eslint-disable-next-line import/no-unresolved
const webpage = require('webpage');
const fs = require('fs');

const port = 8080;

const CSS = fs.read('../../node_modules/@elastic/eui/dist/eui_theme_k6_light.css', 'utf8');

const queue = [];

server.listen(port, function (request, response) {
  const queryIndex = request.url.indexOf('?');
  const params = {};
  if (queryIndex >= 0) {
    const queries = request.url.substr(queryIndex + 1).split('&');
    for (let i = 0; i < queries.length; i++) {
      try {
        const match = queries[i].match(/([^=]*)=(.*)/);
        params[match[1]] = decodeURIComponent(match[2]);
      } catch (e) { /* silent fail */ }
    }
  }

  queue.push({ response: response, html: request.post });
  consumeCapture();
});

console.log('running on port: ', port);

const NUM_PAGES = 10;
let pages = NUM_PAGES;

function consumeCapture() {
  while (queue.length && pages > 0) {
    pages--;
    capture(queue.shift());
  }
}

function capture(data) {
  data.selector = '.content';

  console.log('start', data.selector);

  const page = webpage.create();

  page.content = '<html><head><style>' + CSS + '</style></head>'
    + '<body style="width: 800px;"><div class="content" style="padding: 20px; display: inline-block">'
    + data.html + '</div></body></html>';

  const originalRect = { left: 0, top: 0, width: 500, height: 500 };

  const rect = page.evaluate(function (data) {
    const element = document.querySelector(data.selector);
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
