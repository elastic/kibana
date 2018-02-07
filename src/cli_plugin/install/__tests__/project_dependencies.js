import expect from 'expect.js';
import { resolve } from 'path';

import { prepareProjectDependencies } from '../project_dependencies';

describe('kibana cli', () => {
  describe('plugin installer', () => {
    describe('prepareProjectDependencies', () => {
      it('does nothing when Kibana `link:` dependencies', async () => {
        const settings = {
          workingPath: resolve(__dirname, 'fixtures/with_kibana_link_deps')
        };

        try {
          await prepareProjectDependencies(settings);
        } catch (e) {
          expect.fail(`Expected not to throw, but got [${e.message}]`);
        }
      });

      it('throws if non-Kibana `link` dependencies', async () => {
        const settings = {
          workingPath: resolve(__dirname, 'fixtures/with_other_link_deps')
        };

        try {
          await prepareProjectDependencies(settings);
          expect.fail('Expected "prepareProjectDependencies" to throw');
        } catch (e) {
          expect(e.message).to.eql(
            'This plugin is using `link:` dependencies for non-Kibana packages'
          );
        }
      });
    });
  });
});
