let isBabelRegistered;
jest.mock('../../babel-register', () => {
  isBabelRegistered = true;
});
jest.mock('./native_controller_impl.js',
  () => jest.fn(),
  {
    virtual: true
  });

let nativeController;
let originalProcessArgv;
beforeEach(() => {
  isBabelRegistered = false;
  jest.resetModules();

  // eslint-disable-next-line
  nativeController = require('./native_controller_impl.js'); // this is virtual, it doesn't really exist

  process.send = jest.fn();
  originalProcessArgv = process.argv;
});

afterEach(() => {
  delete process.send;
  process.argv = originalProcessArgv;
  process.removeAllListeners();
});

test(`is babel registered`, () => {
  process.argv = ['node', 'native_controller_start.js', './native_controller_impl.js'];

  require('./native_controller_start');

  expect(isBabelRegistered).toBe(true);
});

test(`doesn't load native controller immediately`, () => {
  process.argv = ['node', 'native_controller_start.js', './native_controller_impl.js'];

  require('./native_controller_start');

  expect(nativeController).toHaveBeenCalledTimes(0);
});

test(`throws error when receives start without call to configure`, () => {
  process.argv = ['node', 'native_controller_start.js', './native_controller_impl.js'];

  require('./native_controller_start');

  expect(() => {
    process.emit('message', { type: 'start' });
  }).toThrowErrorMatchingSnapshot();

  expect(nativeController).toHaveBeenCalledTimes(0);
});

test(`throws error if configure called twice`, () => {
  process.argv = [
    'node',
    'native_controller_start.js',
    './native_controller_impl.js',
  ];

  require('./native_controller_start');
  process.emit('message', { type: 'configure' });
  expect(() => {
    process.emit('message', { type: 'configure', payload: {} });
  }).toThrowErrorMatchingSnapshot();
});

test(`loads native controller on start message`, () => {
  process.argv = ['node', 'native_controller_start.js', './native_controller_impl.js'];

  require('./native_controller_start');
  process.emit('message', { type: 'configure', payload: {} });
  process.emit('message', { type: 'start' });

  expect(nativeController).toHaveBeenCalledTimes(1);
});

test(`passes config to the nativeController`, () => {
  process.argv = [
    'node',
    'native_controller_start.js',
    './native_controller_impl.js',
  ];

  require('./native_controller_start');
  process.emit('message', { type: 'configure', payload: { 'foo.bar': 'baz' } });
  process.emit('message', { type: 'start' });

  expect(nativeController).toHaveBeenCalledTimes(1);
  const call = nativeController.mock.calls[0];
  expect(call[0]).toEqual(new Map([['foo.bar', 'baz']]));
});

test(`removes listener when start message received`, () => {
  process.argv = ['node', 'native_controller_start.js', './native_controller_impl.js'];

  require('./native_controller_start');
  process.emit('message', { type: 'configure', payload: {} });
  process.emit('message', { type: 'start' });
  process.emit('message', { type: 'start' });

  expect(nativeController).toHaveBeenCalledTimes(1);
});
