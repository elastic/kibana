/**
 * This test file contains stubs for chrome.dangerouslyGetActiveInjector, that you will
 * need to load if any part of the code you are testing relies on that method.
 * You will need to call setupInjectorStub and teardownInjectorStub in specific
 * places inside your test file to setup and teardown the stub.
 * If you can call both of them at the same place you can also use the shortcut
 * setupAndTeardownInjectorStub instead.
 */

import ngMock from 'ng_mock';

import chrome from 'ui/chrome';
import sinon from 'sinon';

/**
 * This method setups the stub for chrome.dangerouslyGetActiveInjector. You must call it in
 * a place where beforeEach is allowed to be called (read: inside your describe)
 * method. You must call this AFTER you've called `ngMock.module` to setup the modules,
 * but BEFORE you first execute code, that uses chrome.dangerouslyGetActiveInjector.
 */
export function setupInjectorStub() {
  beforeEach(ngMock.inject(($injector) => {
    sinon.stub(chrome, 'dangerouslyGetActiveInjector').returns(Promise.resolve($injector));
  }));
}

/**
 * This methods tears down the stub for chrome.dangerouslyGetActiveInjector. You must call it
 * in a place where afterEach is allowed to be called.
 */
export function teardownInjectorStub() {
  afterEach(() => {
    chrome.dangerouslyGetActiveInjector.restore();
  });
}

/**
 * This method combines setupInjectorStub and teardownInjectorStub in one method.
 * It can be used if you can call the other two methods directly behind each other.
 */
export function setupAndTeardownInjectorStub() {
  setupInjectorStub();
  teardownInjectorStub();
}
