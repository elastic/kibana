/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EditorContentSpinner } from '../../components/editor_content_spinner';
import { OutputPanelEmptyState } from '../../components/output_panel_empty_state';
import { MonacoEditorOutput } from './monaco_editor_output';
import { useRequestReadContext } from '../../contexts';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';

export const OutputPanel = ({ loading }: { loading: boolean }) => {
  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  // this should likely be simplified and moved to the hook
  const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;
  const isLoading = loading || requestInFlight;

  return (
    <>
      {data ? (
        <MonacoEditorOutput />
      ) : isLoading ? (
        <EditorContentSpinner />
      ) : (
        <OutputPanelEmptyState />
      )}
    </>
  );
};
