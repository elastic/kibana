/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EsDoc {
  _id: string;
  _index: string;
  fields: TestDoc;
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

const firstDoc = {
  title: 'First doc - title',
  subTitle: 'First doc - subTitle',
  description: 'First doc - description',
};

const secondDoc = {
  title: 'Second doc - title',
  subTitle: 'Second doc - subTitle',
  description: 'Second doc - description',
};

const thirdDoc = {
  title: 'Third doc - title',
  subTitle: 'Third doc - subTitle',
  description: 'Third doc - description',
};

export const mockDocuments: EsDoc[] = [
  {
    _id: '001',
    _index: 'testIndex',
    fields: firstDoc,
    _source: firstDoc,
  },
  {
    _id: '002',
    _index: 'testIndex',
    fields: secondDoc,
    _source: secondDoc,
  },
  {
    _id: '003',
    _index: 'testIndex',
    fields: thirdDoc,
    _source: thirdDoc,
  },
];
