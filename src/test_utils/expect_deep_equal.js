import { isEqual } from 'lodash';
import expect from 'expect.js';

// expect.js's `eql` method provides nice error messages but sometimes misses things
// since it only tests loose (==) equality. This function uses lodash's `isEqual` as a
// second sanity check since it checks for strict equality.
export function expectDeepEqual(actual, expected) {
  expect(actual).to.eql(expected);
  expect(isEqual(actual, expected)).to.be(true);
}
