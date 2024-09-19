/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';

export const PreviewAst: React.FC = (props) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);

  if (!query) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel paddingSize="xs" hasShadow={false} hasBorder style={{ height: 600 }}>
        <CodeEditor
          allowFullScreen={true}
          languageId={'json'}
          value={JSON.stringify(query.ast, null, 2)}
        />
      </EuiPanel>
    </>
  );
};
