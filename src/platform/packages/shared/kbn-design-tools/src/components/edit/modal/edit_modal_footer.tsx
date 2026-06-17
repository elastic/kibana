/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UndoRedoSnapshot } from '../../../lib/history/undo_redo_stack';

interface Props {
  draftState: UndoRedoSnapshot;
  onUndo: () => void;
  onRedo: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export const EditModalFooterBar = ({ draftState, onUndo, onRedo, onCancel, onSave }: Props) => {
  return (
    <EuiModalFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="editorUndo"
                aria-label={i18n.translate('kbnDesignTools.edit.modal.undo.ariaLabel', {
                  defaultMessage: 'Undo',
                })}
                onClick={onUndo}
                isDisabled={!draftState.canUndo}
                data-test-subj="editModalUndoButton"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="editorRedo"
                aria-label={i18n.translate('kbnDesignTools.edit.modal.redo.ariaLabel', {
                  defaultMessage: 'Redo',
                })}
                onClick={onRedo}
                isDisabled={!draftState.canRedo}
                data-test-subj="editModalRedoButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="editModalCancelButton" onClick={onCancel}>
                {i18n.translate('kbnDesignTools.edit.modal.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="editModalSaveButton"
                onClick={onSave}
                fill
                disabled={!draftState.canUndo}
              >
                {i18n.translate('kbnDesignTools.edit.modal.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  );
};
