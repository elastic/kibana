import { KibanaError } from '../';
import { cleanStack } from './cleanStack';

test('includes stack', () => {
  try {
    throw new KibanaError('test')
  } catch (e) {
    expect(cleanStack(e.stack)).toMatchSnapshot();
  }
});
