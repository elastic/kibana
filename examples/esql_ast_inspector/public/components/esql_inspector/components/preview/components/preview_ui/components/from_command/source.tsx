/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFieldText, EuiFormRow, EuiIcon, EuiToolTip } from '@elastic/eui';
import { ESQLSource } from '@kbn/esql-ast';
import { ESQLAstBaseItem } from '@kbn/esql-ast/src/types';
import { useEsqlInspector } from '../../../../../../context';
import { useBehaviorSubject } from '../../../../../../../../hooks/use_behavior_subject';

const getFirstComment = (node: ESQLAstBaseItem): string | undefined => {
  const list = node.formatting?.top ?? node.formatting?.left ?? node.formatting?.right;
  if (list) {
    for (const decoration of list) {
      if (decoration.type === 'comment') {
        return decoration.text;
      }
    }
  }
  return undefined;
};

export interface SourceProps {
  node: ESQLSource;
  index: number;
}

export const Source: React.FC<SourceProps> = ({ node, index }) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);

  if (!query) {
    return null;
  }

  const comment = getFirstComment(node);

  return (
    <EuiFormRow
      fullWidth
      helpText={getFirstComment(node)}
      label={
        comment ? (
          <EuiToolTip content={comment}>
            <span>
              Source {index} <EuiIcon type="editorComment" color="subdued" />
            </span>
          </EuiToolTip>
        ) : (
          <>Source {index}</>
        )
      }
    >
      <EuiFieldText
        fullWidth
        value={node.name}
        onChange={(e) => {
          node.name = e.target.value;
          state.reprint();
        }}
      />
    </EuiFormRow>
  );
};
