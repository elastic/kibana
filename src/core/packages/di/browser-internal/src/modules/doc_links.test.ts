/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, DocLinks } from '@kbn/core-di-browser';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { loadDocLinks } from './doc_links';

describe('loadDocLinks', () => {
  let container: Container;
  let docLinks: ReturnType<typeof docLinksServiceMock.createStartContract>;

  beforeEach(() => {
    docLinks = docLinksServiceMock.createStartContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadDocLinks));
    container.bind(CoreStart('docLinks')).toConstantValue(docLinks);
  });

  it('should resolve the doc links service', () => {
    expect(container.get(DocLinks)).toBe(docLinks);
  });
});
