let _ = require('lodash');
let UiApp = require('./UiApp');
let Collection = require('requirefrom')('src')('utils/Collection');

let byIdCache = Symbol('byId');

module.exports = class UiAppCollection extends Collection {

  constructor(uiExports, parent) {
    super();

    this.uiExports = uiExports;

    if (!parent) {
      this.claimedIds = [];
      this.hidden = new UiAppCollection(uiExports, this);
    } else {
      this.claimedIds = parent.claimedIds;
    }

  }

  new(spec) {
    if (this.hidden && spec.hidden) {
      return this.hidden.new(spec);
    }

    let app = new UiApp(this.uiExports, spec);

    if (_.includes(this.claimedIds, app.id)) {
      throw new Error('Unable to create two apps with the id ' + app.id + '.');
    } else {
      this.claimedIds.push(app.id);
    }

    this[byIdCache] = null;
    this.add(app);
    return app;
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = _.indexBy([...this], 'id'));
  }

};
