/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { ResizeChecker } from './resize_checker';
import { EventEmitter } from 'events';

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

describe('Resize Checker', () => {
  describe('events', () => {
    it('is an event emitter', () => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any);

      expect(checker).toBeInstanceOf(EventEmitter);
    });

    it('emits a "resize" event', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any);
              const listener = vi.fn();

              checker.on('resize', listener);
              el.clientHeight = 100;
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener.mock.calls.length).toBe(1);
                done();
              }, 100);
            
        }));
  });

  describe('enable/disabled state', () => {
    it('should not trigger events while disabled', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              expect(listener).not.toHaveBeenCalled();
              el.clientHeight = 100;
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                done();
              }, 100);
            
        }));

    it('should trigger resize events after calling enable', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              expect(listener).not.toHaveBeenCalled();
              checker.enable();
              el.clientHeight = 100;
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener).toHaveBeenCalled();
                done();
              }, 100);
            
        }));

    it('should not trigger the first time after enable when the size does not change', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              expect(listener).not.toHaveBeenCalled();
              el.clientHeight = 100;
              checker.enable();
              el.clientHeight = 100;
              setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                done();
              }, 100);
            
        }));
  });

  describe('#modifySizeWithoutTriggeringResize()', () => {
    it(`does not emit "resize" events caused by the block`, () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              checker.modifySizeWithoutTriggeringResize(() => {
                el.clientHeight = 100;
              });
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                done();
              }, 1000);
            
        }));

    it('does emit "resize" when modification is made between the block and resize notification', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              checker.modifySizeWithoutTriggeringResize(() => {
                el.clientHeight = 100;
              });
              el.dispatchEvent('resize');
              expect(listener).not.toHaveBeenCalled();

              el.clientHeight = 200;
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                done();
              }, 100);
            
        }));
  });

  describe('#destroy()', () => {
    it('destroys internal observer instance', () => {
      const el = new MockElement();
      const checker = new ResizeChecker(el as any, { disabled: true });

      checker.destroy();
      expect(!(checker as any).observer).toBe(true);
    });

    it('does not emit future resize events', () =>
        new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), { fail: reject });

              const el = new MockElement();
              const checker = new ResizeChecker(el as any, { disabled: true });
              const listener = vi.fn();
              checker.on('resize', listener);

              checker.destroy();

              el.clientHeight = 100;
              el.dispatchEvent('resize');
              setTimeout(() => {
                expect(listener).not.toHaveBeenCalled();
                done();
              }, 100);
            
        }));
  });
});
