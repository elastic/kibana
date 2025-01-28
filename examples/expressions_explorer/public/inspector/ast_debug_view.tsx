/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiTreeView, EuiDescriptionList, EuiCodeBlock, EuiText, EuiSpacer } from '@elastic/eui';

interface Props {
  ast: any;
}

const decorateAst = (ast: any, nodeClicked: any) => {
  return ast.chain.map((link: any) => {
    return {
      id: link.function + Math.random(),
      label: link.function,
      callback: () => {
        nodeClicked(link.debug);
      },
      children: Object.keys(link.arguments).reduce((result: any, key: string) => {
        if (typeof link.arguments[key] === 'object') {
          // result[key] = decorateAst(link.arguments[key]);
        }
        return result;
      }, []),
    };
  });
};

const prepareNode = (key: string, value: any) => {
  if (key === 'args') {
    return (
      <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
        {JSON.stringify(value, null, '\t')}
      </EuiCodeBlock>
    );
  } else if (key === 'output' || key === 'input') {
    return (
      <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
        {JSON.stringify(value, null, '\t')}
      </EuiCodeBlock>
    );
  } else if (key === 'success') {
    return value ? 'true' : 'false';
  } else return <span>{value}</span>;
};

export function AstDebugView({ ast }: Props) {
  const [nodeInfo, setNodeInfo] = useState([] as any[]);
  const items = decorateAst(ast, (node: any) => {
    setNodeInfo(
      Object.keys(node).map((key) => ({
        title: key,
        description: prepareNode(key, node[key]),
      }))
    );
  });

  return (
    <div>
      <EuiText>List of executed expression functions:</EuiText>
      <EuiTreeView
        items={items}
        display="compressed"
        expandByDefault
        showExpansionArrows
        aria-label="Document Outline"
      />
      <EuiSpacer />
      <EuiText>Details of selected function:</EuiText>
      <EuiDescriptionList type="column" listItems={nodeInfo} />
    </div>
  );
}
