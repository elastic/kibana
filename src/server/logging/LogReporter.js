import _ from 'lodash';
let Squeeze = require('good-squeeze').Squeeze;
let writeStr = require('fs').createWriteStream;

import LogFormatJson from './LogFormatJson';
import LogFormatString from './log_format_string';

module.exports = class KbnLogger {
  constructor(events, config) {
    this.squeeze = new Squeeze(events);
    this.format = config.json ? new LogFormatJson(config) : new LogFormatString(config);

    if (config.dest === 'stdout') {
      this.dest = process.stdout;
    } else {
      this.dest = writeStr(config.dest, {
        flags: 'a',
        encoding: 'utf8'
      });
    }
  }

  init(readstream, emitter, callback) {

    this.output = readstream.pipe(this.squeeze).pipe(this.format);
    this.output.pipe(this.dest);

    emitter.on('stop', () => {
      this.output.unpipe(this.dest);
    });

    callback();
  }
};
