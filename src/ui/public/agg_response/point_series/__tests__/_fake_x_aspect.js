import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { AggTypesAggTypeProvider } from 'ui/agg_types/agg_type';
import { PointSeriesFakeXAxisProvider } from 'ui/agg_response/point_series/_fake_x_aspect';

describe('makeFakeXAspect', function () {

  let makeFakeXAspect;
  let Vis;
  let AggType;
  let AggConfig;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    AggConfig = Private(VisAggConfigProvider);
    AggType = Private(AggTypesAggTypeProvider);
    indexPattern = Private(VisProvider);
    makeFakeXAspect = Private(PointSeriesFakeXAxisProvider);
  }));

  it('creates an object that looks like an aspect', function () {
    const vis = new Vis(indexPattern, { type: 'histogram' });
    const aspect = makeFakeXAspect(vis);

    expect(aspect)
      .to.have.property('i', -1)
      .and.have.property('agg')
      .and.have.property('col');

    expect(aspect.agg)
      .to.be.an(AggConfig)
      .and.to.have.property('type');

    expect(aspect.agg.type)
      .to.be.an(AggType)
      .and.to.have.property('name', 'all')
      .and.to.have.property('title', 'All docs')
      .and.to.have.property('hasNoDsl', true);

    expect(aspect.col)
      .to.be.an('object')
      .and.to.have.property('aggConfig', aspect.agg)
      .and.to.have.property('label', aspect.agg.makeLabel());
  });
});
