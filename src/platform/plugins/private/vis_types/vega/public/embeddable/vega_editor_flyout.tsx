/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
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
import { i18n } from '@kbn/i18n';
import { VegaSpecEditor } from '../components/vega_vis_editor';

const bodyCss = css({
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    height: '100%',
    '.vgaEditor': { minHeight: 0 },
  },
});

export const VegaEditorFlyout = ({
  ariaLabelledBy,
  closeFlyout,
  initialSpec,
  isNewPanel = false,
  onPreview,
  onRevert,
  onSave,
}: {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  initialSpec: string;

  isNewPanel?: boolean;
  onPreview: (spec: string) => void;
  onRevert: () => void;
  onSave: (spec: string) => void;
}) => {
  const [spec, setSpec] = useState(initialSpec);
  const [previewedSpec, setPreviewedSpec] = useState(initialSpec);
  const canPreview = spec !== previewedSpec;
  const canSave = isNewPanel || spec !== initialSpec;
  const previewChanges = () => {
    onPreview(spec);
    setPreviewedSpec(spec);
  };

  // Revert on unmount unless the user saved. A ref holds the latest callback without re-arming the
  // unmount effect; `saved` suppresses the revert after a successful Save.
  const saved = useRef(false);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;
  useEffect(
    () => () => {
      if (!saved.current) {
        onRevertRef.current();
      }
    },
    []
  );

  const handleSave = () => {
    saved.current = true;
    onSave(spec);
    closeFlyout();
  };
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>Vega</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyCss}>
        <VegaSpecEditor editorValue={spec} onChange={setSpec} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={closeFlyout}>
              {i18n.translate('visTypeVega.dashboard.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="vegaEditorFlyoutPreviewButton"
                  disabled={!canPreview}
                  onClick={previewChanges}
                >
                  {i18n.translate('visTypeVega.dashboard.previewButtonLabel', {
                    defaultMessage: 'Preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="vegaEditorFlyoutSaveButton"
                  fill
                  disabled={!canSave}
                  onClick={handleSave}
                >
                  {i18n.translate('visTypeVega.dashboard.applyAndCloseButtonLabel', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
