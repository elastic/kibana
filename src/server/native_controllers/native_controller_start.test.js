let isBabelRegistered;
let nativeControllerLoadedCount;
jest.mock('../../babel-register', () => {
  isBabelRegistered = true;
});
jest.mock('./__fixtures__/correct/native_controller.js', () => {
  nativeControllerLoadedCount += 1;
});

let originalProcessArgv;
beforeEach(() => {
  // we need to do a `require('./native_controller_start')` after the arrange step
  // in each test, so we're resetting the modules so we "re-require" each time
  jest.resetModules();
  isBabelRegistered = false;
  nativeControllerLoadedCount = 0;
  process.send = jest.fn();
  originalProcessArgv = process.argv;
  jest.spyOn(process, 'addListener');
  jest.spyOn(process, 'removeListener');
});

afterEach(() => {
  delete process.send;
  process.argv = originalProcessArgv;
  process.addListener.mockReset();
  process.addListener.mockRestore();
  process.removeListener.mockReset();
  process.removeListener.mockRestore();
});

test(`is babel registered`, () => {
  require('./native_controller_start');
  expect(isBabelRegistered).toBe(true);
});

test(`doesn't load native controller immediately`, () => {
  process.argv = [null, null, './__fixtures__/correct/native_controller.js'];
  require('./native_controller_start');
  expect(nativeControllerLoadedCount).toBe(0);
});

test(`loads native controller on start message`, () => {
  process.argv = [null, null, './__fixtures__/correct/native_controller.js'];
  require('./native_controller_start');
  expect(process.addListener).toHaveBeenCalledTimes(1);
  const onMessageCall = process.addListener.mock.calls.find(call => call[0] === 'message');
  const messageListener = onMessageCall[1];
  messageListener('start');
  expect(nativeControllerLoadedCount).toBe(1);
});

test(`removes listener when start message received`, () => {
  process.argv = [null, null, './__fixtures__/correct/native_controller.js'];
  require('./native_controller_start');
  expect(process.addListener).toHaveBeenCalledTimes(1);
  const onMessageCall = process.addListener.mock.calls.find(call => call[0] === 'message');
  const messageListener = onMessageCall[1];
  messageListener('start');
  expect(process.removeListener).toHaveBeenCalledTimes(1);
  expect(process.removeListener).toHaveBeenCalledWith('message', expect.anything());
});
