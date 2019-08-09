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

import $ from 'jquery';
import { delay } from 'bluebird';
import expect from '@kbn/expect';
import sinon from 'sinon';

import ngMock from 'ng_mock';
import NoDigestPromises from 'test_utils/no_digest_promises';

import { ResizeChecker } from '../resize_checker';
import EventEmitter from 'events';

describe('Resize Checker', () => {
  NoDigestPromises.activateForSuite();

  const teardown = [];
  let setup;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    setup = () => {

      const createEl = () => {
        const el = $('<div>').appendTo('body').get(0);
        teardown.push(() => $(el).remove());
        return el;
      };

      const createChecker = el => {
        const checker = new ResizeChecker(el);
        teardown.push(() => checker.destroy());
        return checker;
      };

      const createListener = () => {
        let resolveFirstCallPromise;
        const listener = sinon.spy(() => resolveFirstCallPromise());
        listener.firstCallPromise = new Promise(resolve => (resolveFirstCallPromise = resolve));
        return listener;
      };

      return { createEl, createChecker, createListener };
    };
  });

  afterEach(() => {
    teardown.splice(0).forEach(fn => {
      fn();
    });
  });

  describe('construction', () => {
    it('accepts a jQuery wrapped element', () => {
      const { createChecker } = setup();

      createChecker($('<div>'));
    });
  });

  describe('events', () => {
    it('is an event emitter', () => {
      const { createEl, createChecker } = setup();

      const checker = createChecker(createEl());
      expect(checker).to.be.a(EventEmitter);
    });

    it('emits a "resize" event asynchronously', async () => {
      const { createEl, createChecker, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      $(el).height(100);
      sinon.assert.notCalled(listener);
      await listener.firstCallPromise;
      sinon.assert.calledOnce(listener);
    });
  });

  describe('enable/disabled state', () => {
    it('should not trigger events while disabled', async () => {
      const { createEl, createListener } = setup();

      const el = createEl();
      const checker = new ResizeChecker(el, { disabled: true });
      const listener = createListener();
      checker.on('resize', listener);

      expect(listener.notCalled).to.be(true);
      $(el).height(100);
      await delay(1000);
      expect(listener.notCalled).to.be(true);
    });

    it('should trigger resize events after calling enable', async () => {
      const { createEl, createListener } = setup();

      const el = createEl();
      const checker = new ResizeChecker(el, { disabled: true });
      const listener = createListener();
      checker.on('resize', listener);

      expect(listener.notCalled).to.be(true);
      checker.enable();
      $(el).height(100);
      await listener.firstCallPromise;
      expect(listener.calledOnce).to.be(true);
    });

    it('should not trigger the first time after enable when the size does not change', async () => {
      const { createEl, createListener } = setup();

      const el = createEl();
      const checker = new ResizeChecker(el, { disabled: true });
      const listener = createListener();
      checker.on('resize', listener);

      expect(listener.notCalled).to.be(true);
      $(el).height(250);
      checker.enable();
      $(el).height(250);
      await delay(1000);
      expect(listener.notCalled).to.be(true);
    });
  });

  describe('#modifySizeWithoutTriggeringResize()', () => {
    it(`does not emit "resize" events caused by the block`, async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.modifySizeWithoutTriggeringResize(() => {
        $(el).height(100);
      });
      await delay(1000);
      sinon.assert.notCalled(listener);
    });

    it('does emit "resize" when modification is made between the block and resize notification', async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.modifySizeWithoutTriggeringResize(() => {
        $(el).height(100);
      });
      sinon.assert.notCalled(listener);
      $(el).height(200);
      await listener.firstCallPromise;
      sinon.assert.calledOnce(listener);
    });
  });

  describe('#destroy()', () => {
    it('destroys internal observer instance', () => {
      const { createChecker, createEl, createListener } = setup();

      const checker = createChecker(createEl());
      createListener();

      checker.destroy();
      expect(!checker._observer).to.be(true);
    });

    it('does not emit future resize events', async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.destroy();

      $(el).height(100);
      await delay(1000);
      sinon.assert.notCalled(listener);
    });
  });
});
