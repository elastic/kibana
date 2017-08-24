export function RenderError(msg) {
  const err = Error.call(this, msg);
  this.name = err.name = 'RenderError';
  this.message = err.message;
  this.stack = err.stack;
}

RenderError.prototype = Object.create(Error.prototype);
RenderError.prototype.constructor = RenderError;
