define(function (require) {
  return function IpFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function Ip(val) {
      // TODO: add literal support for Ips
      this._val = val;
    }

    Abstract.extend(Ip);

    return Ip;
  };
});