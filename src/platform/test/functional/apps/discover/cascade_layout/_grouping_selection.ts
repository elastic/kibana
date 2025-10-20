/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover } = getPageObjects(['discover']);

  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');

  describe('grouping selection', function () {
    it('should display grouping selector for valid supported ES|QL queries', async () => {
      // write test here
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await testSubjects.exists('discoverEnableCascadeLayoutSwitch')).to.be(true);
    });
  });
}
