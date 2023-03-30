/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { JsonCodeEditor } from './json_code_editor';

export default {
  component: JsonCodeEditor,
  title: 'JSON Code Editor',
};

const MockContext = createKibanaReactContext<any>({
  uiSettings: {
    get: () => false,
  },
});

export function Default() {
  const json = { foo: 'bar' };
  return (
    <MockContext.Provider>
      <JsonCodeEditor json={json} height={300} width={500} hasLineNumbers={true} />
    </MockContext.Provider>
  );
}
