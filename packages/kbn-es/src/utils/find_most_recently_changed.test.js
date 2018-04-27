const mockFs = require('mock-fs');
const { findMostRecentlyChanged } = require('./find_most_recently_changed');

beforeEach(() => {
  mockFs({
    '/data': {
      'oldest.yml': mockFs.file({
        content: 'foo',
        ctime: new Date(2018, 2, 1),
      }),
      'newest.yml': mockFs.file({
        content: 'bar',
        ctime: new Date(2018, 2, 3),
      }),
      'middle.yml': mockFs.file({
        content: 'baz',
        ctime: new Date(2018, 2, 2),
      }),
    },
  });
});

afterEach(() => {
  mockFs.restore();
});

test('returns newest file', () => {
  const file = findMostRecentlyChanged('/data/*.yml');
  expect(file).toEqual('/data/newest.yml');
});
