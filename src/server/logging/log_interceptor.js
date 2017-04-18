import Stream from 'stream';
import { get, isEqual } from 'lodash';

const GET_CLIENT_HELLO = /GET_CLIENT_HELLO:http/;

function doTagsMatch(event, tags) {
  return isEqual(get(event, 'tags'), tags);
}

function doesMessageMatch(errorMessage, match) {
  if (!errorMessage) return false;
  const isRegExp = match instanceof RegExp;
  if (isRegExp) return match.test(errorMessage);
  return errorMessage === match;
}
// converts the given event into a debug log if it's an error of the given type
function downgradeIfErrorType(errorType, event, field = 'errno') {
  const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
  const matchesErrorType = isClientError && get(event, `data.${field}`) === errorType;

  if (!matchesErrorType) return null;

  const errorTypeTag = errorType.toLowerCase();

  return {
    event: 'log',
    pid: event.pid,
    timestamp: event.timestamp,
    tags: ['debug', 'connection', errorTypeTag],
    data: `${errorType}: Socket was closed by the client (probably the browser) before it could be read completely`
  };
}

function downgradeIfErrorMessage(match, event) {
  const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
  const errorMessage = get(event, 'data.message');
  const matchesErrorMessage = isClientError &&  doesMessageMatch(errorMessage, match);

  if (!matchesErrorMessage) return null;

  return {
    event: 'log',
    pid: event.pid,
    timestamp: event.timestamp,
    tags: ['debug', 'connection'],
    data: errorMessage
  };
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
    return downgradeIfErrorType('ECONNRESET', event);
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
    return downgradeIfErrorType('EPIPE', event);
  }

  /**
   *  Since the upgrade to hapi 14, any socket write
   *  error is surfaced as a generic "client error"
   *  but "ECANCELED" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEcanceled(event) {
    return downgradeIfErrorType('ECANCELED', event);
  }

  downgradeIfHTTPSWhenHTTP(event) {
    return downgradeIfErrorType('HPE_INVALID_METHOD', event, 'code');
  }

  downgradeIfHTTPWhenHTTPS(event) {
    return downgradeIfErrorMessage(GET_CLIENT_HELLO, event);
  }

  _transform(event, enc, next) {
    const downgraded = this.downgradeIfEconnreset(event)
      || this.downgradeIfEpipe(event)
      || this.downgradeIfEcanceled(event)
      || this.downgradeIfHTTPSWhenHTTP(event)
      || this.downgradeIfHTTPWhenHTTPS(event);

    this.push(downgraded || event);
    next();
  }
}
