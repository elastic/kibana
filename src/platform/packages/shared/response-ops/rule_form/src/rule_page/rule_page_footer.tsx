/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  useGeneratedHtmlId,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { useAbortableAsync, useBoolean } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import {
  RULE_PAGE_FOOTER_CANCEL_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
  RULE_PAGE_FOOTER_CREATE_TEXT,
  RULE_PAGE_FOOTER_SAVE_TEXT,
} from '../translations';
import { useRuleFormScreenContext, useRuleFormState } from '../hooks';
import { hasRuleErrors } from '../validation';
import { ConfirmCreateRule } from '../components';

export interface RulePageFooterProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (servers: string[]) => void;
}

export const RulePageFooter = (props: RulePageFooterProps) => {
  const [showCreateConfirmation, setShowCreateConfirmation] = useState<boolean>(false);

  const { setIsShowRequestScreenVisible } = useRuleFormScreenContext();

  const { isEdit = false, isSaving = false, onCancel, onSave } = props;

  const {
    plugins: { application },
    formData: { actions },
    connectors,
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
  } = useRuleFormState();

  const hasErrors = useMemo(() => {
    const hasBrokenConnectors = actions.some((action) => {
      return !connectors.find((connector) => connector.id === action.id);
    });

    if (hasBrokenConnectors) {
      return true;
    }

    return hasRuleErrors({
      baseErrors,
      paramsErrors,
      actionsErrors,
      actionsParamsErrors,
    });
  }, [actions, connectors, baseErrors, paramsErrors, actionsErrors, actionsParamsErrors]);

  const saveButtonText = useMemo(() => {
    if (isEdit) {
      return RULE_PAGE_FOOTER_SAVE_TEXT;
    }
    return RULE_PAGE_FOOTER_CREATE_TEXT;
  }, [isEdit]);

  const onOpenShowRequestModalClick = useCallback(() => {
    setIsShowRequestScreenVisible(true);
  }, [setIsShowRequestScreenVisible]);

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

  const onSaveClick = useCallback(() => {
    if (isEdit) {
      return onSave(selectedServers);
    }
    const canReadConnectors = !!application.capabilities.actions?.show;
    if (actions.length === 0 && canReadConnectors) {
      return setShowCreateConfirmation(true);
    }
    onSave(selectedServers);
  }, [isEdit, application.capabilities.actions?.show, actions.length, onSave, selectedServers]);

  const onCreateConfirmClick = useCallback(() => {
    setShowCreateConfirmation(false);
    onSave(selectedServers);
  }, [onSave, selectedServers]);

  const onCreateCancelClick = useCallback(() => {
    setShowCreateConfirmation(false);
  }, []);

  return (
    <>
      <EuiFlexGroup data-test-subj="rulePageFooter" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="rulePageFooterCancelButton"
            onClick={onCancel}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {RULE_PAGE_FOOTER_CANCEL_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="rulePageFooterShowRequestButton"
                onClick={onOpenShowRequestModalClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="rulePageFooterSaveButton"
                onClick={onSaveClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {saveButtonText}
              </EuiButton>
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
      {showCreateConfirmation && (
        <ConfirmCreateRule onConfirm={onCreateConfirmClick} onCancel={onCreateCancelClick} />
      )}
    </>
  );
};
