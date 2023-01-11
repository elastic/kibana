/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSplitPanel,
  EuiText,
  EuiCode,
} from '@elastic/eui';

import { KibanaContent } from '../../../common';
import { useApp } from '../context';

export const ContentPreview: FC<{ type: string; id: string }> = ({ type, id }) => {
  const { rpc } = useApp();
  const [content, setContent] = useState<KibanaContent | null>(null);

  useDebounce(
    () => {
      const load = async () => {
        const res: KibanaContent = await rpc.get({ type, id });
        setContent(res);
      };

      load();
    },
    500,
    [rpc, type, id]
  );

  if (!content) {
    return <span>Loading...</span>;
  }

  return (
    <EuiSplitPanel.Outer grow>
      <EuiSplitPanel.Inner>
        <EuiText>
          <EuiDescriptionListTitle>{content.title}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{content.description}</EuiDescriptionListDescription>
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
