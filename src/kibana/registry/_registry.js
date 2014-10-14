define(function (require) {

  function Registry() {
    this._modules = [];
  }

  Registry.prototype.register = function (privateModule) {
    this._modules.push(privateModule);
  };

  Registry.prototype.load = function (Private) {
    return this._modules.map(Private);
  };

  return Registry;
});