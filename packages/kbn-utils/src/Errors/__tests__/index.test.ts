import { KibanaError } from '../';
import { cleanStack } from './cleanStack';

// TODO This is skipped because it fails depending on Node version. That might
// not be a problem, but I think we should wait with including this test until
// we've made a proper decision around error handling in the new platform, see
// https://github.com/elastic/kibana/issues/12947
test.skip('includes stack', () => {
  try {
    throw new KibanaError('test');
  } catch (e) {
    expect(cleanStack(e.stack)).toMatchSnapshot();
  }
});
