define(function (require) {
  var Ipv4Address = require('utils/ipv4_address');
  var NUM_BITS = 32;

  function throwError(mask) {
    throw Error('Invalid CIDR mask: ' + mask);
  }

  function CidrMask(mask) {
    var splits = mask.split('\/');
    if (splits.length !== 2) throwError(mask);
    this.initialAddress = new Ipv4Address(splits[0]);
    this.prefixLength = Number(splits[1]);
    if (this.prefixLength < 1 || this.prefixLength > NUM_BITS) throwError(mask);
  }

  CidrMask.prototype.getRange = function () {
    return {
      from: this.initialAddress.toString(),
      to: new Ipv4Address(this.initialAddress.valueOf() + Math.pow(2, NUM_BITS - this.prefixLength) - 1).toString()
    };
  };

  CidrMask.prototype.toString = function () {
    return this.initialAddress.toString() + '/' + this.prefixLength;
  };

  return CidrMask;
});