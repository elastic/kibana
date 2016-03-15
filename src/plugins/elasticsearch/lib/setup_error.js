import _ from 'lodash';
import util from 'util';

function SetupError(server, template, err) {
  const config = server.config().get();
  // don't override other setup errors
  if (err && err instanceof SetupError) return err;
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = _.template(template)(config);
  if (err) {
    this.origError = err;
    if (err.stack) this.stack = err.stack;
  }
}
util.inherits(SetupError, Error);
module.exports = SetupError;

