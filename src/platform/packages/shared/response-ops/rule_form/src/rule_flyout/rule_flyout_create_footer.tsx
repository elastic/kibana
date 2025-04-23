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
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { useAbortableAsync, useBoolean } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import {
  RULE_FLYOUT_FOOTER_BACK_TEXT,
  RULE_FLYOUT_FOOTER_CANCEL_TEXT,
  RULE_FLYOUT_FOOTER_CREATE_TEXT,
  RULE_FLYOUT_FOOTER_NEXT_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
} from '../translations';
import { useRuleFormState } from '../hooks';

export interface RuleFlyoutCreateFooterProps {
  isSaving: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onSave: (servers: string[]) => void;
  onShowRequest: () => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}
export const RuleFlyoutCreateFooter = ({
  onCancel,
  onSave,
  onShowRequest,
  hasErrors,
  isSaving,
  hasNextStep,
  hasPreviousStep,
  goToNextStep,
  goToPreviousStep,
}: RuleFlyoutCreateFooterProps) => {
  const {
    plugins: { http },
  } = useRuleFormState();
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const [selectedServers, setSelectedServers] = React.useState<string[]>([]);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const { loading: loadingServerList, value: serverList } = useAbortableAsync(
    async ({ signal: s }) => {
      const response = await http.get<{
        servers: Array<{ error: true } | { error: false; name: string }>;
      }>('/api/cck/status', {
        signal: s,
      });
      return [
        '_local',
        ...response.servers
          .filter((server): server is { error: false; name: string } => !server.error)
          .map((server) => server.name),
      ];
    },
    [http]
  );
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {hasPreviousStep ? (
            <EuiButtonEmpty
              data-test-subj="ruleFlyoutFooterPreviousStepButton"
              onClick={goToPreviousStep}
            >
              {RULE_FLYOUT_FOOTER_BACK_TEXT}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty data-test-subj="ruleFlyoutFooterCancelButton" onClick={onCancel}>
              {RULE_FLYOUT_FOOTER_CANCEL_TEXT}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
            {!hasNextStep && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  data-test-subj="ruleFlyoutFooterShowRequestButton"
                  isDisabled={isSaving || hasErrors}
                  onClick={onShowRequest}
                >
                  {RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {hasNextStep ? (
                <EuiButton
                  fill
                  data-test-subj="ruleFlyoutFooterNextStepButton"
                  onClick={goToNextStep}
                >
                  {RULE_FLYOUT_FOOTER_NEXT_TEXT}
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  data-test-subj="ruleFlyoutFooterSaveButton"
                  type="submit"
                  isDisabled={isSaving || hasErrors}
                  isLoading={isSaving}
                  onClick={() => onSave(selectedServers)}
                >
                  {RULE_FLYOUT_FOOTER_CREATE_TEXT}
                </EuiButton>
              )}
            </EuiFlexItem>
            {serverList && serverList.length > 1 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id={splitButtonPopoverId}
                  isOpen={isPopoverOpen}
                  button={
                    <EuiButtonIcon
                      data-test-subj="streamsAppGrokAiPickConnectorButton"
                      onClick={togglePopover}
                      display="base"
                      size="s"
                      iconType="boxesVertical"
                      aria-label={i18n.translate(
                        'xpack.streams.refreshButton.euiButtonIcon.moreLabel',
                        {
                          defaultMessage: 'More',
                        }
                      )}
                    />
                  }
                >
                  <EuiContextMenuPanel
                    size="s"
                    items={serverList.map((server) => (
                      <EuiContextMenuItem
                        key={server}
                        icon={selectedServers.some((s) => s === server) ? 'check' : 'empty'}
                        onClick={() => {
                          setSelectedServers((prev) => {
                            if (prev.includes(server)) {
                              return prev.filter((s) => s !== server);
                            }
                            return [...prev, server];
                          });
                        }}
                      >
                        {server}
                      </EuiContextMenuItem>
                    ))}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
