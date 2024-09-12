/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { TextBasedLanguagesEditorProps } from '@kbn/text-based-editor';
import { untilPluginStartServicesReady } from './kibana_services';

export const TextBasedLangEditor = (props: TextBasedLanguagesEditorProps) => {
  const { loading, value } = useAsync(() => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('@kbn/text-based-editor');
    return Promise.all([startServicesPromise, modulePromise]);
  }, []);

  const TextBasedLanguagesEditor = value?.[1]?.default;
  const deps = value?.[0];

  if (loading || !deps || !TextBasedLanguagesEditor) return <EuiLoadingSpinner />;

  return (
    <KibanaContextProvider
      services={{
        ...deps,
      }}
    >
      <TextBasedLanguagesEditor {...props} />
    </KibanaContextProvider>
  );
};
