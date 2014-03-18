var queue = require("../queue");

console.log(JSON.stringify({
  "name": "queue-async",
  "version": queue.version,
  "description": "A little helper for asynchronous JavaScript.",
  "keywords": [
    "asynchronous",
    "async",
    "queue"
  ],
  "author": {
    "name": "Mike Bostock",
    "url": "http://bost.ocks.org/mike"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/mbostock/queue.git"
  },
  "main": "queue.js",
  "devDependencies": {
    "uglify-js": "2",
    "vows": "0.7"
  },
  "scripts": {
    "test": "vows; echo"
  }
}, null, 2));
