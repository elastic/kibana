/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewer } from '../components/doc_viewer/doc_viewer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDocViewerDirective(reactDirective: any) {
  return reactDirective(
    (props: React.ComponentProps<typeof DocViewer>) => {
      return <DocViewer {...props} />;
    },
    [
      'hit',
      ['indexPattern', { watchDepth: 'reference' }],
      ['filter', { watchDepth: 'reference' }],
      ['columns', { watchDepth: 'collection' }],
      ['onAddColumn', { watchDepth: 'reference' }],
      ['onRemoveColumn', { watchDepth: 'reference' }],
      ['showMultiFields', { watchDepth: 'reference' }],
    ],
    {
      restrict: 'E',
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
        columns: '=?',
        onAddColumn: '=?',
        onRemoveColumn: '=?',
        showMultiFields: '=?',
      },
    }
  );
}
