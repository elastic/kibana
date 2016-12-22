import { LogInterceptor } from './log_interceptor';

let _ = require('lodash');
let Squeeze = require('good-squeeze').Squeeze;
let writeStr = require('fs').createWriteStream;

let LogFormatJson = require('./LogFormatJson');
let LogFormatString = require('./LogFormatString');

module.exports = class KbnLogger {
  constructor(events, config) {
    this.squeeze = new Squeeze(events);
    this.format = config.json ? new LogFormatJson(config) : new LogFormatString(config);
    this.logInterceptor = new LogInterceptor();

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

    this.output = readstream
      .pipe(this.logInterceptor)
      .pipe(this.squeeze)
      .pipe(this.format);

    this.output.pipe(this.dest);

    emitter.on('stop', () => {
      this.output.unpipe(this.dest);
    });

    callback();
  }
};
