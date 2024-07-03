/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiFieldSearch,
  EuiFacetButton,
  EuiModalBody,
  EuiHorizontalRule,
  EuiModalHeaderTitle,
  useEuiTheme,
  EuiEmptyPrompt,
  EuiFacetGroup,
  EuiCard,
  EuiIcon,
  EuiText,
  EuiSpacer,
  useCurrentEuiBreakpoint,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { ActionType } from '@kbn/actions-types';
import { ActionConnector } from '../../common';
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
  connectors: ActionConnector[];
  actionTypes: ActionType[];
  onClose: () => void;
  onSelectConnector: (connector: ActionConnector) => void;
}

export const RuleActionsConnectorsModal = (props: RuleActionsConnectorsModalProps) => {
  const { connectors, actionTypes, onClose, onSelectConnector } = props;

  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedConnector, setSelectedConnector] = useState<string>('all');

  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const {
    plugins: { actionTypeRegistry },
  } = useRuleFormState();

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const onConnectorOptionSelect = useCallback(
    (id: string) => () => {
      setSelectedConnector((prev) => {
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
    setSelectedConnector('all');
  }, []);

  const connectorsMap: ConnectorsMap | null = useMemo(() => {
    return connectors.reduce<ConnectorsMap>((result, { actionTypeId }) => {
      if (result[actionTypeId]) {
        result[actionTypeId].total += 1;
      } else {
        result[actionTypeId] = {
          actionTypeId,
          total: 1,
          name: actionTypes.find(({ id }) => actionTypeId === id)?.name || '',
        };
      }
      return result;
    }, {});
  }, [connectors, actionTypes]);

  const filteredConnectors = useMemo(() => {
    return connectors
      .filter(({ actionTypeId }) => {
        if (selectedConnector === 'all' || selectedConnector === '') {
          return true;
        }
        if (selectedConnector === actionTypeId) {
          return true;
        }
        return false;
      })
      .filter(({ actionTypeId, name }) => {
        const trimmedSearchValue = searchValue.trim().toLocaleLowerCase();
        if (trimmedSearchValue === '') {
          return true;
        }
        const actionTypeModel = actionTypeRegistry.get(actionTypeId);
        const actionType = actionTypes.find(({ id }) => id === actionTypeId);
        const textSearchTargets = [
          name.toLocaleLowerCase(),
          actionTypeModel.selectMessage?.toLocaleLowerCase(),
          actionTypeModel.actionTypeTitle?.toLocaleLowerCase(),
          actionType?.name?.toLocaleLowerCase(),
        ];
        return textSearchTargets.some((text) => text?.includes(trimmedSearchValue));
      });
  }, [connectors, selectedConnector, searchValue, actionTypes, actionTypeRegistry]);

  const connectorFacetButtons = useMemo(() => {
    return (
      <EuiFacetGroup>
        <EuiFacetButton
          key="all"
          quantity={connectors.length}
          isSelected={selectedConnector === 'all'}
          onClick={onConnectorOptionSelect('all')}
        >
          {ACTION_TYPE_MODAL_FILTER_ALL}
        </EuiFacetButton>
        {Object.values(connectorsMap)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ actionTypeId, name, total }) => {
            return (
              <EuiFacetButton
                key={actionTypeId}
                quantity={total}
                isSelected={selectedConnector === actionTypeId}
                onClick={onConnectorOptionSelect(actionTypeId)}
              >
                {name}
              </EuiFacetButton>
            );
          })}
      </EuiFacetGroup>
    );
  }, [connectors, connectorsMap, selectedConnector, onConnectorOptionSelect]);

  const connectorCards = useMemo(() => {
    if (!filteredConnectors.length) {
      return (
        <EuiEmptyPrompt
          color="subdued"
          iconType="search"
          title={<h2>{ACTION_TYPE_MODAL_EMPTY_TITLE}</h2>}
          body={
            <EuiText>
              <p>{ACTION_TYPE_MODAL_EMPTY_TEXT}</p>
            </EuiText>
          }
          actions={
            <EuiButton size="s" color="primary" fill onClick={onClearFilters}>
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
          const actionType = actionTypes.find((item) => item.id === actionTypeId);
          return (
            <EuiFlexItem key={id} grow={false}>
              <EuiCard
                hasBorder
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
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }, [filteredConnectors, actionTypeRegistry, actionTypes, onSelectConnector, onClearFilters]);

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
