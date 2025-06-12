/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { IndexUpdateService } from '../index_update_service';

export interface FlyoutFooterProps {
  indexUpdateService: IndexUpdateService;
}

export const FlyoutFooter: FC<FlyoutFooterProps> = ({ indexUpdateService }) => {
  const undoTimeLeft = useObservable(indexUpdateService.undoTimer$);

  const undoInSeconds: string = undoTimeLeft ? `${Math.floor(undoTimeLeft / 1000)}s` : null;

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={() => {}} flush="left">
            <FormattedMessage
              id="xpack.dataVisualizer.file.uploadView.closeButton"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {undoTimeLeft ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType={'editorUndo'}
                  iconSize={'m'}
                  iconSide={'left'}
                  onClick={() => {
                    // Undo the last change
                    indexUpdateService.undo();
                  }}
                >
                  <FormattedMessage
                    id="indexEditor.flyout.footer.primaryButtonLabel.save"
                    defaultMessage="Undo"
                  />
                  &nbsp;
                  <span>{undoInSeconds}</span>
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}

            {false ? (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty onClick={() => {}} disabled={true}>
                    <FormattedMessage
                      id="indexEditor.flyout.footer.primaryButtonLabel.saving"
                      defaultMessage="Saving..."
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
            {true ? (
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => {}}>
                  <FormattedMessage
                    id="indexEditor.flyout.footer.primaryButtonLabel.save"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
