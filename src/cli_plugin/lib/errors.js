export function UnsupportedProtocolError() {
  Error.call(this, 'Unsupported protocol');
}

UnsupportedProtocolError.prototype = Object.create(Error.prototype);
