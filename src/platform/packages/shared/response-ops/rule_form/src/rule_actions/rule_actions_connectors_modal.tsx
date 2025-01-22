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
  EuiCard,
  EuiEmptyPrompt,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { ActionConnector, checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useRuleFormState } from '../hooks';
import {
  ACTION_TYPE_MODAL_EMPTY_TEXT,
  ACTION_TYPE_MODAL_EMPTY_TITLE,
  ACTION_TYPE_MODAL_FILTER_ALL,
  ACTION_TYPE_MODAL_TITLE,
  MODAL_SEARCH_CLEAR_FILTERS_TEXT,
  MODAL_SEARCH_PLACEHOLDER,
} from '../translations';

type ConnectorsMap = Record<string, { actionTypeId: string; name: string; total: number }>;

export interface RuleActionsConnectorsModalProps {
  onClose: () => void;
  onSelectConnector: (connector: ActionConnector) => void;
}

export const RuleActionsConnectorsModal = (props: RuleActionsConnectorsModalProps) => {
  const { onClose, onSelectConnector } = props;

  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedConnectorType, setSelectedConnectorType] = useState<string>('all');

  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const {
    plugins: { actionTypeRegistry },
    formData: { actions },
    connectors,
    connectorTypes,
  } = useRuleFormState();

  const preconfiguredConnectors = useMemo(() => {
    return connectors.filter((connector) => connector.isPreconfigured);
  }, [connectors]);

  const availableConnectors = useMemo(() => {
    return connectors.filter(({ actionTypeId }) => {
      const actionType = connectorTypes.find(({ id }) => id === actionTypeId);
      const actionTypeModel = actionTypeRegistry.get(actionTypeId);

      if (!actionType) {
        return false;
      }

      if (!actionTypeModel.actionParamsFields) {
        return false;
      }

      const checkEnabledResult = checkActionFormActionTypeEnabled(
        actionType,
        preconfiguredConnectors
      );

      if (!actionType.enabledInConfig && !checkEnabledResult.isEnabled) {
        return false;
      }

      return true;
    });
  }, [connectors, connectorTypes, preconfiguredConnectors, actionTypeRegistry]);

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const onConnectorOptionSelect = useCallback(
    (id: string) => () => {
      setSelectedConnectorType((prev) => {
        if (prev === id) {
          return '';
        }
        return id;
      });
    },
    []
  );

  const onClearFilters = useCallback(() => {
    setSearchValue('');
    setSelectedConnectorType('all');
  }, []);

  const connectorsMap: ConnectorsMap | null = useMemo(() => {
    return availableConnectors.reduce<ConnectorsMap>((result, { actionTypeId }) => {
      const actionTypeModel = actionTypeRegistry.get(actionTypeId);
      const subtype = actionTypeModel.subtype;

      const shownActionTypeId = actionTypeModel.hideInUi
        ? subtype?.filter((type) => type.id !== actionTypeId)[0].id
        : undefined;

      const currentActionTypeId = shownActionTypeId ? shownActionTypeId : actionTypeId;

      if (result[currentActionTypeId]) {
        result[currentActionTypeId].total += 1;
      } else {
        result[currentActionTypeId] = {
          actionTypeId: currentActionTypeId,
          total: 1,
          name: connectorTypes.find(({ id }) => id === currentActionTypeId)?.name || '',
        };
      }

      return result;
    }, {});
  }, [availableConnectors, connectorTypes, actionTypeRegistry]);

  const filteredConnectors = useMemo(() => {
    return availableConnectors
      .filter(({ actionTypeId }) => {
        const subtype = actionTypeRegistry.get(actionTypeId).subtype?.map((type) => type.id);

        if (selectedConnectorType === 'all' || selectedConnectorType === '') {
          return true;
        }

        if (subtype?.includes(selectedConnectorType)) {
          return subtype.includes(actionTypeId);
        }

        return selectedConnectorType === actionTypeId;
      })
      .filter(({ actionTypeId, name }) => {
        const trimmedSearchValue = searchValue.trim().toLocaleLowerCase();
        if (trimmedSearchValue === '') {
          return true;
        }
        const actionTypeModel = actionTypeRegistry.get(actionTypeId);
        const actionType = connectorTypes.find(({ id }) => id === actionTypeId);
        const textSearchTargets = [
          name.toLocaleLowerCase(),
          actionTypeModel.selectMessage?.toLocaleLowerCase(),
          actionTypeModel.actionTypeTitle?.toLocaleLowerCase(),
          actionType?.name?.toLocaleLowerCase(),
        ];
        return textSearchTargets.some((text) => text?.includes(trimmedSearchValue));
      });
  }, [availableConnectors, selectedConnectorType, searchValue, connectorTypes, actionTypeRegistry]);

  const connectorFacetButtons = useMemo(() => {
    return (
      <EuiFacetGroup
        data-test-subj="ruleActionsConnectorsModalFilterButtonGroup"
        style={{ overflow: 'auto' }}
      >
        <EuiFacetButton
          data-test-subj="ruleActionsConnectorsModalFilterButton"
          key="all"
          quantity={availableConnectors.length}
          isSelected={selectedConnectorType === 'all'}
          onClick={onConnectorOptionSelect('all')}
        >
          {ACTION_TYPE_MODAL_FILTER_ALL}
        </EuiFacetButton>
        {Object.values(connectorsMap)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ actionTypeId, name, total }) => {
            return (
              <EuiFacetButton
                data-test-subj="ruleActionsConnectorsModalFilterButton"
                key={actionTypeId}
                quantity={total}
                isSelected={selectedConnectorType === actionTypeId}
                onClick={onConnectorOptionSelect(actionTypeId)}
              >
                {name}
              </EuiFacetButton>
            );
          })}
      </EuiFacetGroup>
    );
  }, [availableConnectors, connectorsMap, selectedConnectorType, onConnectorOptionSelect]);

  const connectorCards = useMemo(() => {
    if (!filteredConnectors.length) {
      return (
        <EuiEmptyPrompt
          data-test-subj="ruleActionsConnectorsModalEmpty"
          color="subdued"
          iconType="search"
          title={<h2>{ACTION_TYPE_MODAL_EMPTY_TITLE}</h2>}
          body={
            <EuiText>
              <p>{ACTION_TYPE_MODAL_EMPTY_TEXT}</p>
            </EuiText>
          }
          actions={
            <EuiButton
              data-test-subj="ruleActionsConnectorsModalClearFiltersButton"
              size="s"
              color="primary"
              fill
              onClick={onClearFilters}
            >
              {MODAL_SEARCH_CLEAR_FILTERS_TEXT}
            </EuiButton>
          }
        />
      );
    }
    return (
      <EuiFlexGroup direction="column">
        {filteredConnectors.map((connector) => {
          const { id, actionTypeId, name } = connector;
          const actionTypeModel = actionTypeRegistry.get(actionTypeId);
          const actionType = connectorTypes.find((item) => item.id === actionTypeId);

          if (!actionType) {
            return null;
          }

          const checkEnabledResult = checkActionFormActionTypeEnabled(
            actionType,
            preconfiguredConnectors
          );

          const isSystemActionsSelected = Boolean(
            actionTypeModel.isSystemActionType &&
              actions.find((action) => action.actionTypeId === actionTypeModel.id)
          );

          const isDisabled = !checkEnabledResult.isEnabled || isSystemActionsSelected;

          const connectorCard = (
            <EuiCard
              data-test-subj="ruleActionsConnectorsModalCard"
              hasBorder
              isDisabled={isDisabled}
              titleSize="xs"
              layout="horizontal"
              icon={
                <div style={{ marginInlineEnd: `16px` }}>
                  <Suspense fallback={<EuiLoadingSpinner />}>
                    <EuiIcon size="l" type={actionTypeModel.iconClass} />
                  </Suspense>
                </div>
              }
              title={name}
              description={
                <>
                  <EuiText size="xs">{actionTypeModel.selectMessage}</EuiText>
                  <EuiSpacer size="s" />
                  <EuiText color="subdued" size="xs" style={{ textTransform: 'uppercase' }}>
                    <strong>{actionType?.name}</strong>
                  </EuiText>
                </>
              }
              onClick={() => onSelectConnector(connector)}
            />
          );

          return (
            <EuiFlexItem key={id} grow={false}>
              {checkEnabledResult.isEnabled && connectorCard}
              {!checkEnabledResult.isEnabled && (
                <EuiToolTip position="top" content={checkEnabledResult.message}>
                  {connectorCard}
                </EuiToolTip>
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }, [
    actions,
    preconfiguredConnectors,
    filteredConnectors,
    actionTypeRegistry,
    connectorTypes,
    onSelectConnector,
    onClearFilters,
  ]);

  const responseiveHeight = isFullscreenPortrait ? 'initial' : '80vh';
  const responsiveOverflow = isFullscreenPortrait ? 'auto' : 'hidden';

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={euiTheme.breakpoint[currentBreakpoint]}
      style={{
        width: euiTheme.breakpoint[currentBreakpoint],
        maxHeight: responseiveHeight,
        height: responseiveHeight,
        overflow: responsiveOverflow,
      }}
      data-test-subj="ruleActionsConnectorsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">{ACTION_TYPE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" style={{ overflow: responsiveOverflow, height: '100%' }}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFieldSearch
                  data-test-subj="ruleActionsConnectorsModalSearch"
                  placeholder={MODAL_SEARCH_PLACEHOLDER}
                  value={searchValue}
                  onChange={onSearchChange}
                />
              </EuiFlexItem>
              <EuiHorizontalRule margin="none" />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem style={{ overflow: responsiveOverflow }}>
            <EuiFlexGroup style={{ overflow: responsiveOverflow }}>
              <EuiFlexItem grow={1}>{connectorFacetButtons}</EuiFlexItem>
              <EuiFlexItem
                grow={3}
                style={{
                  overflow: 'auto',
                  width: '100%',
                  padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}`,
                }}
              >
                {connectorCards}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
};
