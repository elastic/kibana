import Stream from 'stream';
import { get, isEqual } from 'lodash';

function doTagsMatch(event, tags) {
  return isEqual(get(event, 'tags'), tags);
}

export class LogInterceptor extends Stream.Transform {
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: true
    });
  }

  /**
   *  Since the upgrade to hapi 14, any socket read
   *  error is surfaced as a generic "client error"
   *  but "ECONNRESET" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEconnreset(event) {
    const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
    const isEconnreset = isClientError && get(event, 'data.errno') === 'ECONNRESET';

    if (!isEconnreset) return null;

    return {
      event: 'log',
      pid: event.pid,
      timestamp: event.timestamp,
      tags: ['debug', 'connection', 'econnreset'],
      data: 'ECONNRESET: Socket was closed by the client (probably the browser) before it could be read completely'
    };
  }

  /**
   *  Since the upgrade to hapi 14, any socket write
   *  error is surfaced as a generic "client error"
   *  but "EPIPE" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEpipe(event) {
    const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
    const isEpipe = isClientError && get(event, 'data.errno') === 'EPIPE';

    if (!isEpipe) return null;

    return {
      event: 'log',
      pid: event.pid,
      timestamp: event.timestamp,
      tags: ['debug', 'connection', 'epipe'],
      data: 'EPIPE: Socket was closed by the client (probably the browser) before the response could be completed'
    };
  }

  _transform(event, enc, next) {
    const downgraded = this.downgradeIfEconnreset(event) || this.downgradeIfEpipe(event);

    this.push(downgraded || event);
    next();
  }
};
