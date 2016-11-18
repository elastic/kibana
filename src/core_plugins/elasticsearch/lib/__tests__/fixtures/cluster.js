import sinon from 'sinon';

module.exports = class Cluster {
  constructor() {
    this.callAsKibanaUser = sinon.stub();
    this.callWithRequest = sinon.stub();
  }
};
