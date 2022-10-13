/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface EsDoc {
  _id: string;
  _index: string;
  _source: TestDoc;
}

export interface TestDoc {
  title: string;
  subTitle: string;
  description: string;
}

interface PreviewErrorArgs {
  reason: string;
  scriptStack?: string[];
  position?: { offset: number; start: number; end: number } | null;
}

export const createPreviewError = ({
  reason,
  scriptStack = [],
  position = null,
}: PreviewErrorArgs) => {
  return {
    caused_by: { reason },
    position,
    script_stack: scriptStack,
  };
};

export const mockDocuments: EsDoc[] = [
  {
    _id: '001',
    _index: 'testIndex',
    _source: {
      title: 'First doc - title',
      subTitle: 'First doc - subTitle',
      description: 'First doc - description',
    },
  },
  {
    _id: '002',
    _index: 'testIndex',
    _source: {
      title: 'Second doc - title',
      subTitle: 'Second doc - subTitle',
      description: 'Second doc - description',
    },
  },
  {
    _id: '003',
    _index: 'testIndex',
    _source: {
      title: 'Third doc - title',
      subTitle: 'Third doc - subTitle',
      description: 'Third doc - description',
    },
  },
];
