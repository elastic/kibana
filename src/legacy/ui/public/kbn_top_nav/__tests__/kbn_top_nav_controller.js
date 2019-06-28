/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { pluck } from 'lodash';
import sinon from 'sinon';
import { KbnTopNavControllerProvider } from '../kbn_top_nav_controller';

describe('KbnTopNavController', function () {
  let KbnTopNavController;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    KbnTopNavController = Private(KbnTopNavControllerProvider);
  }));

  describe('opts', function () {
    it('supports giving it no options', function () {
      new KbnTopNavController();
    });

    it('support empty options list', function () {
      new KbnTopNavController([]);
    });

    describe('key:', function () {
      it('requires every opt to have a key', function () {
        expect(function () {
          new KbnTopNavController([
            { foo: 'bar' }
          ]);
        }).to.throwError(TypeError);
      });
    });

    describe('label:', function () {
      it('gives each menu item a label based on the key', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: 'Bar' },
          { key: '1234' },
        ]);

        expect(pluck(controller.opts, 'label')).to.eql([
          'Foo',
          'Bar',
          '1234',
        ]);
      });
    });

    describe('description:', function () {
      it('defaults to "Toggle ${label} view" when using templates', function () {
        const controller = new KbnTopNavController([
          { key: 'foo', template: '<h1></h1>' },
          { key: 'Bar', description: 'not the default' },
          { key: '1234', run: ()=>{} },
        ]);

        expect(pluck(controller.opts, 'description')).to.eql([
          'Toggle Foo view',
          'not the default',
          '1234',
        ]);
      });
    });

    describe('hideButton:', function () {
      it('defaults to a function that returns false', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234' },
        ]);

        pluck(controller.opts, 'hideButton').forEach(prop => {
          expect(prop).to.be.a(Function);
          expect(prop()).to.eql(false);
        });
      });

      it('excludes opts from opts when set to true', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234', hideButton: true },
        ]);

        expect(controller.menuItems).to.have.length(1);
      });

      it('excludes opts from opts when set to a function that returns true', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234', hideButton: () => true },
        ]);

        expect(controller.menuItems).to.have.length(1);
      });
    });

    describe('disableButton:', function () {
      it('defaults to a function that returns false', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234' },
        ]);

        pluck(controller.opts, 'disableButton').forEach(prop => {
          expect(prop).to.be.a(Function);
          expect(prop()).to.eql(false);
        });
      });
    });

    describe('tooltip:', function () {
      it('defaults to a function that returns undefined', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234' },
        ]);

        pluck(controller.opts, 'tooltip').forEach(prop => {
          expect(prop).to.be.a(Function);
          expect(prop()).to.eql(undefined);
        });
      });
    });

    describe('run:', function () {
      it('defaults to a function that toggles the key', function () {
        const controller = new KbnTopNavController([
          { key: 'foo', template: 'Hi' }
        ]);

        const opt = controller.opts[0];
        expect(opt.run).to.be.a('function');
        expect(controller.getCurrent()).to.not.be(opt.key);
        opt.run(opt);
        expect(controller.getCurrent()).to.be(opt.key);
        opt.run(opt);
        expect(controller.getCurrent()).to.not.be(opt.key);
      });

      it('uses the supplied run function otherwise', function (done) { // eslint-disable-line mocha/handle-done-callback
        const controller = new KbnTopNavController([
          { key: 'foo', run: done }
        ]);

        const opt = controller.opts[0];
        opt.run();
      });
    });
  });

  describe('methods', function () {
    const init = function () {
      const controller = new KbnTopNavController([
        { key: 'foo', template: 'Say Foo!' },
        { key: 'bar', template: 'Whisper Bar' },
      ]);
      const render = sinon.spy(controller, '_render');
      const setCurrent = sinon.spy(controller, 'setCurrent');
      const getCurrent = sinon.spy(controller, 'getCurrent');

      return { controller, render, setCurrent, getCurrent };
    };

    describe('#setCurrent([key])', function () {
      it('assigns the passed key to the current key', function () {
        const { controller } = init();
        expect(controller.getCurrent()).to.not.be('foo');
        controller.setCurrent('foo');
        expect(controller.getCurrent()).to.be('foo');
      });

      it('throws if the key does not match a known template', function () {
        const { controller } = init();
        expect(function () {
          controller.setCurrent('june');
        }).to.throwError(/unknown template key/);
      });

      it('sets to "null" for falsy values', function () {
        const { controller } = init();

        controller.setCurrent();
        expect(controller.getCurrent()).to.be(null);

        controller.setCurrent(false);
        expect(controller.getCurrent()).to.be(null);

        controller.setCurrent(null);
        expect(controller.getCurrent()).to.be(null);

        controller.setCurrent('');
        expect(controller.getCurrent()).to.be(null);
      });

      it('rerenders after setting', function () {
        const { controller, render } = init();

        sinon.assert.notCalled(render);
        controller.setCurrent('bar');
        sinon.assert.calledOnce(render);
        controller.setCurrent('bar');
        sinon.assert.calledTwice(render);
      });
    });

    describe('#isCurrent(key)', function () {
      it('returns true when key matches', function () {
        const { controller } = init();

        controller.setCurrent('foo');
        expect(controller.isCurrent('foo')).to.be(true);
        expect(controller.isCurrent('bar')).to.be(false);

        controller.setCurrent('bar');
        expect(controller.isCurrent('bar')).to.be(true);
        expect(controller.isCurrent('foo')).to.be(false);
      });
    });

    describe('#open(key)', function () {
      it('alias for set', function () {
        const { controller, setCurrent } = init();

        controller.open('foo');
        sinon.assert.calledOnce(setCurrent);
        sinon.assert.calledWithExactly(setCurrent, 'foo');
      });
    });

    describe('#close()', function () {
      it('set the current key to null', function () {
        const { controller } = init();

        controller.open('foo');
        controller.close();
        expect(controller.getCurrent()).to.be(null);
      });
    });

    describe('#close(key)', function () {
      it('sets to null if key is open', function () {
        const { controller } = init();

        expect(controller.getCurrent()).to.be(null);
        controller.close('foo');
        expect(controller.getCurrent()).to.be(null);
        controller.open('foo');
        expect(controller.getCurrent()).to.be('foo');
        controller.close('foo');
        expect(controller.getCurrent()).to.be(null);
      });

      it('ignores if other key is open', function () {
        const { controller } = init();

        expect(controller.getCurrent()).to.be(null);
        controller.open('foo');
        expect(controller.getCurrent()).to.be('foo');
        controller.close('bar');
        expect(controller.getCurrent()).to.be('foo');
      });
    });

    describe('#toggle()', function () {
      it('opens if closed', function () {
        const { controller } = init();

        expect(controller.getCurrent()).to.be(null);
        controller.toggle('foo');
        expect(controller.getCurrent()).to.be('foo');
      });

      it('opens if other is open', function () {
        const { controller } = init();

        controller.open('bar');
        expect(controller.getCurrent()).to.be('bar');
        controller.toggle('foo');
        expect(controller.getCurrent()).to.be('foo');
      });

      it('closes if open', function () {
        const { controller } = init();

        controller.open('bar');
        expect(controller.getCurrent()).to.be('bar');
        controller.toggle('bar');
        expect(controller.getCurrent()).to.be(null);
      });
    });

    describe('#addItems(opts)', function () {
      it('should append to existing menu items', function () {
        const { controller } = init();
        const newItems = [
          { key: 'green', template: 'Green means go' },
          { key: 'red', template: 'Red means stop' },
        ];

        expect(controller.menuItems).to.have.length(2);
        controller.addItems(newItems);
        expect(controller.menuItems).to.have.length(4);

        // check that the items were added
        const matches = controller.menuItems.reduce((acc, item) => {
          if (item.key === 'green' || item.key === 'red') {
            acc[item.key] = item;
          }
          return acc;
        }, {});
        expect(matches).to.have.property('green');
        expect(matches.green).to.have.property('run');
        expect(matches).to.have.property('red');
        expect(matches.red).to.have.property('run');
      });

      it('should take a single menu item object', function () {
        const { controller } = init();
        const newItem = { key: 'green', template: 'Green means go' };

        expect(controller.menuItems).to.have.length(2);
        controller.addItems(newItem);
        expect(controller.menuItems).to.have.length(3);

        // check that the items were added
        const match = controller.menuItems.filter((item) => {
          return item.key === 'green';
        });
        expect(match[0]).to.have.property('run');
      });
    });

  });
});
