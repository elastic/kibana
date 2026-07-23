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
import { i18n } from '@kbn/i18n';
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
  onApply,
  onCancel,
  onSave,
}: {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  initialSpec: string;
  onApply: (spec: string) => void;
  onCancel?: () => void;
  onSave: (spec: string) => void;
}) => {
  const [spec, setSpec] = useState(initialSpec);
  const [appliedSpec, setAppliedSpec] = useState(initialSpec);
  const isDirty = spec !== appliedSpec;
  const applyPreview = () => {
    onApply(spec);
    setAppliedSpec(spec);
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
          <VegaSpecEditor editorValue={spec} onChange={setSpec} />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onCancel ?? closeFlyout}>
              {i18n.translate('visTypeVega.dashboard.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="vegaEditorFlyoutApplyButton"
                  disabled={!isDirty}
                  onClick={applyPreview}
                >
                  {i18n.translate('visTypeVega.dashboard.applyButtonLabel', {
                    defaultMessage: 'Apply',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="vegaEditorFlyoutSaveButton"
                  fill
                  onClick={() => {
                    onSave(spec);
                    closeFlyout();
                  }}
                >
                  {i18n.translate('visTypeVega.dashboard.saveButtonLabel', {
                    defaultMessage: 'Save',
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
