define(function (require) {
  return function AttachmentFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function Attachment(val) {
      this._val = val;
    }

    Abstract.extend(Attachment);

    Attachment.prototype.toString = function () {
      throw new TypeError('toString is not supported for Attachment type fields');
    };

    return Attachment;
  };
});