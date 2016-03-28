// Load modules

var Domain = require('domain');
var Boom = require('boom');
var Hoek = require('hoek');


// Declare internals

var internals = {};


exports = module.exports = internals.Protect = function (request) {

    var self = this;

    this._error = null;
    this._at = '';
    this.logger = request;                          // Replaced with server when request completes

    this.domain = Domain.create();
    this.domain.on('error', function (err) {

        var handler = self._error;
        if (handler) {
            self._error = null;
            return handler(err);
        }

        self.logger._log(['internal', 'implementation', 'error'], err);
    });
};


internals.Protect.prototype.run = function (at, next, enter) {          // enter: function (exit)

    var self = this;

    Hoek.assert(!this._error, 'Invalid nested use of protect.run() during: ' + this._at + ' while trying: ' + at);

    var finish = function (arg0, arg1, arg2) {

        self._error = null;
        self._at = '';
        return next(arg0, arg1, arg2);
    };

    finish = Hoek.once(finish);

    this._at = at;
    this._error = function (err) {

        return finish(Boom.badImplementation('Uncaught error', err));
    };

    enter(finish);
};


internals.Protect.prototype.reset = function () {

    this._error = null;
    this._at = '';
};
