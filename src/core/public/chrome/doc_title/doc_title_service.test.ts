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
      getStart().change('TitleA');
      expect(document.title).toEqual('TitleA - KibanaTest');
    });

    it('appends the baseTitle to the title', async () => {
      const start = getStart('BaseTitle');
      start.change('TitleA');
      expect(document.title).toEqual('TitleA - BaseTitle');
      start.change('TitleB');
      expect(document.title).toEqual('TitleB - BaseTitle');
    });

    it('accepts string arrays as input', async () => {
      const start = getStart();
      start.change(['partA', 'partB']);
      expect(document.title).toEqual(`partA - partB - ${defaultTitle}`);
      start.change(['partA', 'partB', 'partC']);
      expect(document.title).toEqual(`partA - partB - partC - ${defaultTitle}`);
    });
  });

  describe('#reset()', () => {
    it('resets the title to the initial value', async () => {
      const start = getStart('InitialTitle');
      start.change('TitleA');
      expect(document.title).toEqual('TitleA - InitialTitle');
      start.reset();
      expect(document.title).toEqual('InitialTitle');
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
