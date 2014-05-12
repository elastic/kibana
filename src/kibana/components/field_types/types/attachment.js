define(function (require) {
  return function AttachmentFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function Attachment(val) {
      throw new TypeError('Kibana does not support attachment type fields');
    }

    Abstract.extend(Attachment);

    Attachment.prototype.toString = function () {};

    return Attachment;
  };
});