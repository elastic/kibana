/**
 * Import this test utility in your jest test (and only there!) if you want the
 * htmlIdGenerator from EUI to generate static ids. That will be needed if you
 * want to use snapshot tests for a component, that uses the htmlIdGenerator.
 * By default every test run would result in different ids and thus not be comparable.
 * You can solve this by just importing this file. It will mock the htmlIdGenerator
 * for the test file that imported it to produce static, but therfore potentially
 * duplicate ids.
 *
 * import 'test_utils/html_id_generator';
 */

/* global jest */
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: (prefix = 'staticGenerator') => {
    return (suffix = 'staticId') => `${prefix}_${suffix}`;
  }
}));
