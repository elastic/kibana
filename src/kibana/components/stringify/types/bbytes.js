define(function (require) {
  return function BytesFormatProvider(Private) {
    var _ = require('lodash');
    var Number = Private(require('components/stringify/types/Number'));

    _(Bytes).inherits(Number);
    function Bytes(params) {
      Bytes.Super.call(this, params);
    }

    Bytes.id = 'bytes';
    Bytes.title = 'Bytes';
    Bytes.fieldType = 'number';

    Bytes.prototype._units = 'b';

    return Bytes;
  };
});
