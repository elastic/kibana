import { values } from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';
import pluginInit from '../plugin_init';

describe('Plugin init', () => {
  const getPluginCollection = (plugins) => ({
    byId: plugins,
    toArray: () => values(plugins)
  });

  it('should call preInit before init', async () => {
    const plugins = {
      foo: {
        id: 'foo',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: []
      },
      bar: {
        id: 'bar',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: []
      },
      baz: {
        id: 'baz',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: []
      }
    };

    await pluginInit(getPluginCollection(plugins));

    expect(plugins.foo.preInit.calledBefore(plugins.foo.init)).to.be.ok();
    expect(plugins.foo.preInit.calledBefore(plugins.bar.init)).to.be.ok();
    expect(plugins.foo.preInit.calledBefore(plugins.baz.init)).to.be.ok();

    expect(plugins.bar.preInit.calledBefore(plugins.foo.init)).to.be.ok();
    expect(plugins.bar.preInit.calledBefore(plugins.bar.init)).to.be.ok();
    expect(plugins.bar.preInit.calledBefore(plugins.baz.init)).to.be.ok();

    expect(plugins.baz.preInit.calledBefore(plugins.foo.init)).to.be.ok();
    expect(plugins.baz.preInit.calledBefore(plugins.bar.init)).to.be.ok();
    expect(plugins.baz.preInit.calledBefore(plugins.baz.init)).to.be.ok();
  });

  it('should call preInits in correct order based on requirements', async () => {
    const plugins = {
      foo: {
        id: 'foo',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar', 'baz']
      },
      bar: {
        id: 'bar',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: []
      },
      baz: {
        id: 'baz',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar']
      }
    };

    await pluginInit(getPluginCollection(plugins));

    expect(plugins.bar.preInit.firstCall.calledBefore(plugins.foo.init.firstCall)).to.be.ok();
    expect(plugins.bar.preInit.firstCall.calledBefore(plugins.baz.init.firstCall)).to.be.ok();
    expect(plugins.baz.preInit.firstCall.calledBefore(plugins.foo.init.firstCall)).to.be.ok();
  });
});
