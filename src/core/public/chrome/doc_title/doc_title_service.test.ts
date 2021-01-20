/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
});
