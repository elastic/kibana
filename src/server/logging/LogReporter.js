let _ = require('lodash');
let Squeeze = require('good-squeeze').Squeeze;
let writeStr = require('fs').createWriteStream;

let LogFormatJson = require('./LogFormatJson');
let LogFormatString = require('./LogFormatString');

module.exports = class KbnLogger {
  constructor(events, config) {
    this.squeeze = new Squeeze(events);
    this.format = config.json ? new LogFormatJson() : new LogFormatString();

    if (config.dest === 'stdout') {
      this.dest = process.stdout;
    } else {
      this.dest = writeStr(config.dest, {
        mode: 'a',
        encoding: 'utf8'
      });
    }
  }

  init(readstream, emitter, callback) {
    readstream
    .pipe(this.squeeze)
    .pipe(this.format)
    .pipe(this.dest);

    emitter.on('stop', _.noop);

    callback();
  }
};
