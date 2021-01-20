/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { DocViewer } from '../components/doc_viewer/doc_viewer';

export function createDocViewerDirective(reactDirective: any) {
  return reactDirective(
    (props: any) => {
      return <DocViewer {...props} />;
    },
    [
      'hit',
      ['indexPattern', { watchDepth: 'reference' }],
      ['filter', { watchDepth: 'reference' }],
      ['columns', { watchDepth: 'collection' }],
      ['onAddColumn', { watchDepth: 'reference' }],
      ['onRemoveColumn', { watchDepth: 'reference' }],
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
      },
    }
  );
}
