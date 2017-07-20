import _ from 'lodash';
import sinon from 'sinon';

function MockState(defaults) {
  this.on = _.noop;
  this.off = _.noop;
  this.save = sinon.stub();
  this.replace = sinon.stub();
  _.assign(this, defaults);
}

export default MockState;
