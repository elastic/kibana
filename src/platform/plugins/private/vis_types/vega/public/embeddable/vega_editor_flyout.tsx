/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VegaByValueState } from '../../server';

const bodyCss = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 16,
  minHeight: 0,
});

const editorContainerCss = css({
  blockSize: 'clamp(320px, 60vh, 720px)',
  display: 'flex',
  minHeight: 0,
  overflow: 'hidden',
});

const VegaSpecEditor = lazy(() =>
  import('../components/vega_vis_editor').then((module) => ({ default: module.VegaSpecEditor }))
);

const specFromEditor = (
  text: string,
  format: VegaByValueState['spec']['format']
): VegaByValueState['spec'] => {
  if (format === 'json') {
    try {
      return { format: 'json', value: JSON.parse(text) };
    } catch {
      return { format: 'hjson', value: text };
    }
  }
  return { format: 'hjson', value: text };
};

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
  initialSpec: VegaByValueState['spec'];
  isNewPanel?: boolean;
  onPreview: (spec: VegaByValueState['spec']) => void;
  onRevert: () => void;
  onSave: (spec: VegaByValueState['spec']) => void;
}) => {
  const initialEditorValue =
    initialSpec.format === 'json' ? JSON.stringify(initialSpec.value, null, 2) : initialSpec.value;
  const [spec, setSpec] = useState(initialEditorValue);
  const [previewedSpec, setPreviewedSpec] = useState(initialEditorValue);
  const [format, setFormat] = useState<VegaByValueState['spec']['format']>(initialSpec.format);
  const canPreview = spec !== previewedSpec;
  const canSave = isNewPanel || spec !== initialEditorValue;

  // Revert on unmount unless the user saved. A ref holds the latest callback without re-arming the
  // unmount effect; `saved` suppresses the revert after a successful Save.
  const saved = useRef(false);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;
  useEffect(
    () => () => {
      if (saved.current) return;
      onRevertRef.current();
    },
    []
  );

  const previewChanges = () => {
    onPreview(specFromEditor(spec, format));
    setPreviewedSpec(spec);
  };

  const handleSave = () => {
    saved.current = true;
    onSave(specFromEditor(spec, format));
    closeFlyout();
  };
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>Vega</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="editorFlyoutBody">
        <div css={bodyCss}>
          <div css={editorContainerCss}>
            <Suspense
              fallback={
                <EuiSkeletonText
                  lines={3}
                  data-test-subj="vegaEditorFlyoutLoading"
                  aria-label={i18n.translate('visTypeVega.dashboard.editorLoadingAriaLabel', {
                    defaultMessage: 'Loading Vega editor',
                  })}
                />
              }
            >
              <VegaSpecEditor
                editorValue={spec}
                initialFormat={initialSpec.format}
                onChange={setSpec}
                onFormatChange={setFormat}
              />
            </Suspense>
          </div>
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={closeFlyout}
              data-test-subj="vegaEditorFlyoutCancelButton"
            >
              {i18n.translate('visTypeVega.dashboard.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  disabled={!canPreview}
                  onClick={previewChanges}
                  data-test-subj="vegaEditorFlyoutPreviewButton"
                >
                  {i18n.translate('visTypeVega.dashboard.previewButtonLabel', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={!canSave}
                  onClick={handleSave}
                  data-test-subj="vegaEditorFlyoutSaveButton"
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
