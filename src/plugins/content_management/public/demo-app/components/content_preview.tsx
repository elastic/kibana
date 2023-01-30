/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSplitPanel,
  EuiText,
  EuiCode,
} from '@elastic/eui';

import { Content } from '../../../common';
import { useApp } from '../context';

export const ContentPreview: FC<{ type: string; id: string }> = ({ type, id }) => {
  const { rpc } = useApp();
  const [content, setContent] = useState<Content | null>(null);
  const isIdEmpty = id.trim() === '';

  useDebounce(
    () => {
      const load = async () => {
        const res = await rpc.getPreview({ type, id });
        setContent(res);
      };

      if (!isIdEmpty) {
        load();
      }
    },
    500,
    [rpc, type, id, isIdEmpty]
  );

  if (isIdEmpty) {
    return <EuiText>Provide an id to load the content</EuiText>;
  }

  if (!content) {
    return <span>Loading...</span>;
  }

  return (
    <EuiSplitPanel.Outer grow>
      <EuiSplitPanel.Inner>
        <EuiText>
          <EuiDescriptionListTitle>{content.title}</EuiDescriptionListTitle>
          {Boolean(content.description) && (
            <EuiDescriptionListDescription>{content.description}</EuiDescriptionListDescription>
          )}
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow={false} color="subdued">
        <EuiText>
          <p>
            Type <EuiCode>{content.type}</EuiCode>
          </p>
        </EuiText>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
