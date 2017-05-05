export function Registry(prop = 'name') {
  const _indexed = new Object();

  this.register = (obj) => {
    _indexed[obj[prop]] = obj;
  };

  this.toJS = () => {
    return { ..._indexed };
  };

  this.get = (name) => {
    return _indexed[name];
  };
}
