/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DocTitleService } from './doc_title_service';

describe('DocTitleService', () => {
  const defaultTitle = 'KibanaTest';
  const document = { title: '' };

  const getStart = (title: string = defaultTitle) => {
    document.title = title;
    return new DocTitleService().start({ document });
  };

  beforeEach(() => {
    document.title = defaultTitle;
  });

  describe('#change()', () => {
    it('changes the title of the document', async () => {
      getStart().change({ parts: ['TitleA'], excludeBase: true });
      expect(document.title).toEqual('TitleA');
    });

    it('appends the baseTitle to the title unless specified otherwise', async () => {
      const start = getStart('BaseTitle');
      start.change({ parts: ['TitleA'], excludeBase: true });
      expect(document.title).toEqual('TitleA');
      start.change({ parts: ['TitleB'], excludeBase: false });
      expect(document.title).toEqual('TitleB - BaseTitle');
      start.change({ parts: ['TitleC'] });
      expect(document.title).toEqual('TitleC - BaseTitle');
    });

    it('accepts strings as input', async () => {
      const start = getStart();
      start.change('string title');
      expect(document.title).toEqual(`string title - ${defaultTitle}`);
    });

    it('accepts string arrays as input', async () => {
      const start = getStart();
      start.change(['partA', 'partB']);
      expect(document.title).toEqual(`partA - partB - ${defaultTitle}`);
    });

    it('does not set the title until manual apply if apply param is false', async () => {
      const start = getStart();
      start.change({ parts: ['TitleA'], excludeBase: true }, false);
      expect(document.title).toEqual(defaultTitle);
      start.apply();
      expect(document.title).toEqual('TitleA');
    });
  });

  describe('#reset()', () => {
    it('resets the title to the initial value', async () => {
      const start = getStart('InitialTitle');
      start.change({ parts: ['TitleA'], excludeBase: true });
      expect(document.title).toEqual('TitleA');
      start.reset();
      expect(document.title).toEqual('InitialTitle');
    });

    it('does not reset until manual apply if apply param is false', async () => {
      const start = getStart('ManualApplyTest');
      start.change({ parts: ['TitleA'], excludeBase: true });
      expect(document.title).toEqual('TitleA');
      start.reset(false);
      expect(document.title).toEqual('TitleA');
      start.apply();
      expect(document.title).toEqual('ManualApplyTest');
    });
  });

  describe('#__legacy.setBaseTitle()', () => {
    it('allows to change the baseTitle after startup', async () => {
      const start = getStart('InitialTitle');
      start.change('WithInitial');
      expect(document.title).toEqual('WithInitial - InitialTitle');
      start.__legacy.setBaseTitle('NewBaseTitle');
      start.change('WithNew');
      expect(document.title).toEqual('WithNew - NewBaseTitle');
      start.reset();
      expect(document.title).toEqual('NewBaseTitle');
    });
  });
});
