import _ from 'lodash';

import LogFormatJson from './log_format_json';
import LogFormatString from './log_format_string';
import { Squeeze } from 'good-squeeze';
import { createWriteStream as writeStr } from 'fs';

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
