/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { VegaSpecEditor } from '../components/vega_vis_editor';

const bodyCss = css({
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    height: '100%',
  },
});

const editorContainerCss = css({
  display: 'flex',
  flex: '1 1 auto',
  minHeight: 0,
  width: '100%',
});

export const VegaEditorFlyout = ({
  ariaLabelledBy,
  closeFlyout,
  initialSpec,
  onCancel,
  onChange,
  onSave,
}: {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  initialSpec: string;
  onCancel?: () => void;
  onChange?: (spec: string) => void;
  onSave: (spec: string) => void;
}) => {
  const [spec, setSpec] = useState(initialSpec);
  const updateSpec = (nextSpec: string) => {
    setSpec(nextSpec);
    onChange?.(nextSpec);
  };
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>Vega</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyCss}>
        <div css={editorContainerCss}>
          <VegaSpecEditor editorValue={spec} onChange={updateSpec} />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onCancel ?? closeFlyout}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => {
                onSave(spec);
                closeFlyout();
              }}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
