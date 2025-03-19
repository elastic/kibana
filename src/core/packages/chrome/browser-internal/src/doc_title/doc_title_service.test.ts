/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocTitleService } from './doc_title_service';

describe('DocTitleService', () => {
  const defaultTitle = 'KibanaTest';
  let document: { title: string };

  const getStart = (title: string = defaultTitle) => {
    document.title = title;
    const docTitle = new DocTitleService();
    docTitle.setup({ document });
    return docTitle.start();
  };

  beforeEach(() => {
    document = { title: defaultTitle };
  });

  describe('#setup', () => {
    describe('title$', () => {
      it('emits with the initial title', () => {
        document.title = 'Kibana';
        const docTitle = new DocTitleService();
        const { title$ } = docTitle.setup({ document });
        docTitle.start();

        const titles: string[] = [];
        title$.subscribe((title) => {
          titles.push(title);
        });

        expect(titles).toEqual(['Kibana']);
      });

      it('emits when the title changes', () => {
        document.title = 'Kibana';
        const docTitle = new DocTitleService();
        const { title$ } = docTitle.setup({ document });
        const { change } = docTitle.start();

        const titles: string[] = [];
        title$.subscribe((title) => {
          titles.push(title);
        });

        change('title 2');
        change('title 3');

        expect(titles).toEqual(['Kibana', 'title 2 - Kibana', 'title 3 - Kibana']);
      });

      it('emits when the title is reset', () => {
        document.title = 'Kibana';
        const docTitle = new DocTitleService();
        const { title$ } = docTitle.setup({ document });
        const { change, reset } = docTitle.start();

        const titles: string[] = [];
        title$.subscribe((title) => {
          titles.push(title);
        });

        change('title 2');
        reset();

        expect(titles).toEqual(['Kibana', 'title 2 - Kibana', 'Kibana']);
      });

      it('only emits on unique titles', () => {
        document.title = 'Kibana';
        const docTitle = new DocTitleService();
        const { title$ } = docTitle.setup({ document });
        const { change } = docTitle.start();

        const titles: string[] = [];
        title$.subscribe((title) => {
          titles.push(title);
        });

        change('title 2');
        change('title 2');
        change('title 3');

        expect(titles).toEqual(['Kibana', 'title 2 - Kibana', 'title 3 - Kibana']);
      });
    });
  });

  describe('#start', () => {
    it('throws if called before #setup', () => {
      const docTitle = new DocTitleService();
      expect(() => docTitle.start()).toThrowErrorMatchingInlineSnapshot(
        `"DocTitleService#setup must be called before DocTitleService#start"`
      );
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
});
