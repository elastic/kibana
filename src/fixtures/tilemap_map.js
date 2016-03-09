import sinon from 'auto-release-sinon';

function MockMap(container, chartData, params) {
  this.container = container;
  this.chartData = chartData;
  this.params = params;

  // stub required methods
  this.addStubs();
}

MockMap.prototype.addStubs = function () {
  this.addTitle = sinon.stub();
  this.addFitControl = sinon.stub();
  this.addBoundingControl = sinon.stub();
  this.destroy = sinon.stub();
};

export default MockMap;