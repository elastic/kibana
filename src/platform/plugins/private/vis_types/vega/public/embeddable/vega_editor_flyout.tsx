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
import type { VegaByValueState } from '../../server/embeddable/schema';

const bodyCss = css({
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    height: '100%',
    '.vgaEditor': { minHeight: 0 },
  },
});

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
  isByReference = false,
  isNewPanel = false,
  onPreview,
  onRevert,
  onSave,
}: {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  initialSpec: VegaByValueState['spec'];

  isByReference?: boolean;
  isNewPanel?: boolean;
  onPreview: (spec: VegaByValueState['spec']) => void;
  onRevert: () => void;
  onSave: (spec: VegaByValueState['spec']) => Promise<void> | void;
}) => {
  const initialEditorValue =
    initialSpec.format === 'json' ? JSON.stringify(initialSpec.value, null, 2) : initialSpec.value;
  const [spec, setSpec] = useState(initialEditorValue);
  const [previewedSpec, setPreviewedSpec] = useState(initialEditorValue);
  const [format, setFormat] = useState<VegaByValueState['spec']['format']>(initialSpec.format);
  const [isSaving, setIsSaving] = useState(false);
  const canPreview = spec !== previewedSpec;
  const canSave = isNewPanel || spec !== initialEditorValue;
  const previewChanges = () => {
    onPreview(specFromEditor(spec, format));
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(specFromEditor(spec, format));
      saved.current = true;
      closeFlyout();
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>Vega</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyCss}>
        <VegaSpecEditor
          editorValue={spec}
          initialFormat={initialSpec.format}
          onChange={setSpec}
          onFormatChange={setFormat}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="vegaEditorFlyoutCancelButton"
              flush="left"
              onClick={closeFlyout}
            >
              {i18n.translate('visTypeVega.dashboard.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  data-test-subj="vegaEditorFlyoutPreviewButton"
                  disabled={!canPreview}
                  iconType="play"
                  onClick={previewChanges}
                >
                  {i18n.translate('visTypeVega.dashboard.previewButtonLabel', {
                    defaultMessage: 'Run Preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="vegaEditorFlyoutSaveButton"
                  fill
                  disabled={!canSave || isSaving}
                  isLoading={isSaving}
                  onClick={handleSave}
                >
                  {isByReference
                    ? i18n.translate('visTypeVega.dashboard.saveAndCloseButtonLabel', {
                        defaultMessage: 'Save and close',
                      })
                    : i18n.translate('visTypeVega.dashboard.applyAndCloseButtonLabel', {
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
