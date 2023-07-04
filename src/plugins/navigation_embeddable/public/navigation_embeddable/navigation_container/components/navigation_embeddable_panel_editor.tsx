/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { LinkInput, NavigationContainerInput } from '../../types';
import { NavigationEmbeddableLinkEditor } from './navigation_embeddable_link_editor';

import './navigation_embeddable.scss';

export const NavigationEmbeddablePanelEditor = ({
  initialInput,
  onSave,
  onClose,
  currentDashboardId,
}: {
  initialInput: Partial<NavigationContainerInput>;
  onSave: (input: Partial<NavigationContainerInput>) => void;
  onClose: () => void;
  currentDashboardId?: string;
}) => {
  const [showLinkEditorFlyout, setShowLinkEditorFlyout] = useState(false);
  const [panels, setPanels] = useState(initialInput.panels);
  const [newLinks, setNewLinks] = useState<LinkInput[]>([]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Create links panel</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow>
            <>
              {!panels || Object.keys(panels).length === 0 ? (
                <EuiPanel hasBorder={true}>
                  <EuiFlexGroup justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{"You haven't added any links yet."}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        onClick={() => setShowLinkEditorFlyout(true)}
                        iconType="plusInCircle"
                      >
                        Add link
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              ) : (
                <>
                  {Object.keys(panels).map((panelId) => {
                    return (
                      <>
                        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                          {panels[panelId].explicitInput.id}
                        </EuiPanel>
                        <EuiSpacer size="s" />
                      </>
                    );
                  })}
                  <EuiButtonEmpty
                    iconType="plusInCircle"
                    onClick={() => setShowLinkEditorFlyout(true)}
                  >
                    Add link
                  </EuiButtonEmpty>
                </>
              )}
            </>
          </EuiFormRow>
          <EuiFormRow>
            {/* TODO: As part of https://github.com/elastic/kibana/issues/154362, connect this to the library */}
            <EuiSwitch label="Save to library" onChange={() => {}} checked={false} />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              // aria-label={`cancel-${currentInput.title}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={onClose}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                onSave({ ...initialInput, panels });
                onClose();
              }}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {showLinkEditorFlyout && (
        <NavigationEmbeddableLinkEditor
          initialInput={initialInput}
          onClose={() => setShowLinkEditorFlyout(false)}
          onSave={(newInput) => {
            setPanels(newInput.panels);
          }}
          currentDashboardId={currentDashboardId}
        />
      )}
    </>
  );
};
