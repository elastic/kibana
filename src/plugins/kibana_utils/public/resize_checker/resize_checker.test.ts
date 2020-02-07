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
import { ResizeChecker } from './resize_checker';
import { EventEmitter } from 'events';

// If you want to know why these mocks are created,
// please check: https://github.com/elastic/kibana/pull/44750
jest.mock('resize-observer-polyfill');
import ResizeObserver from 'resize-observer-polyfill';

class MockElement {
  public clientWidth: number;
  public clientHeight: number;
  private onResize: any;

  constructor() {
    this.clientHeight = 0;
    this.clientWidth = 0;
    this.onResize = null;
  }

  public addEventListener(name: string, listener: any) {
    this.onResize = listener;
  }

  public dispatchEvent(name: string) {
    if (this.onResize) {
      this.onResize();
    }
  }

  public removeEventListener(name: string, listener: any) {
    this.onResize = null;
  }
}

(ResizeObserver as any).mockImplementation(function(this: any, callback: any) {
  this.observe = function(el: MockElement) {
    el.addEventListener('resize', callback);
  };
  this.disconnect = function() {};
  this.unobserve = function(el: MockElement) {
    el.removeEventListener('resize', callback);
  };
});

describe('Resize Checker', () => {
  describe('events', () => {
    it('is an event emitter', () => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any);

      expect(checker).toBeInstanceOf(EventEmitter);
    });

    it('emits a "resize" event', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any);
      const listener = jest.fn();

      checker.on('resize', listener);
      el.clientHeight = 100;
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener.mock.calls.length).toBe(1);
        done();
      }, 100);
    });
  });

  describe('enable/disabled state', () => {
    it('should not trigger events while disabled', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      expect(listener).not.toBeCalled();
      el.clientHeight = 100;
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener).not.toBeCalled();
        done();
      }, 100);
    });

    it('should trigger resize events after calling enable', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      expect(listener).not.toBeCalled();
      checker.enable();
      el.clientHeight = 100;
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener).toBeCalled();
        done();
      }, 100);
    });

    it('should not trigger the first time after enable when the size does not change', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      expect(listener).not.toBeCalled();
      el.clientHeight = 100;
      checker.enable();
      el.clientHeight = 100;
      setTimeout(() => {
        expect(listener).not.toBeCalled();
        done();
      }, 100);
    });
  });

  describe('#modifySizeWithoutTriggeringResize()', () => {
    it(`does not emit "resize" events caused by the block`, done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      checker.modifySizeWithoutTriggeringResize(() => {
        el.clientHeight = 100;
      });
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener).not.toBeCalled();
        done();
      }, 1000);
    });

    it('does emit "resize" when modification is made between the block and resize notification', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      checker.modifySizeWithoutTriggeringResize(() => {
        el.clientHeight = 100;
      });
      el.dispatchEvent('resize');
      expect(listener).not.toBeCalled();

      el.clientHeight = 200;
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener).not.toBeCalled();
        done();
      }, 100);
    });
  });

  describe('#destroy()', () => {
    it('destroys internal observer instance', () => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });

      checker.destroy();
      expect(!(checker as any).observer).toBe(true);
    });

    it('does not emit future resize events', done => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });
      const listener = jest.fn();
      checker.on('resize', listener);

      checker.destroy();

      el.clientHeight = 100;
      el.dispatchEvent('resize');
      setTimeout(() => {
        expect(listener).not.toBeCalled();
        done();
      }, 100);
    });
  });
});
