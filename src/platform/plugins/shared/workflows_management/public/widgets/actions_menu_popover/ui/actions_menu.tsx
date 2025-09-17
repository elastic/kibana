/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiSelectable,
  EuiHighlight,
  EuiText,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getAllConnectors } from '../../../../common/schema';
import type { ActionOptionData } from '../types';

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
}

function getActionOptions(): ActionOptionData[] {
  const connectors = getAllConnectors();
  const triggersGroup: ActionOptionData = {
    iconType: 'menuDown',
    id: 'triggers',
    label: i18n.translate('workflows.actionsMenu.triggers', {
      defaultMessage: 'Triggers',
    }),
    description: i18n.translate('workflows.actionsMenu.triggersDescription', {
      defaultMessage: 'Triggers are the events that start a workflow.',
    }),
    isGroupLabel: false,
    options: [
      {
        id: 'manual',
        label: i18n.translate('workflows.actionsMenu.manual', {
          defaultMessage: 'Manual',
        }),
        description: i18n.translate('workflows.actionsMenu.manualDescription', {
          defaultMessage: 'Manually start a workflow.',
        }),
        iconType: 'play',
        isGroupLabel: false,
      },
      {
        id: 'alert',
        label: i18n.translate('workflows.actionsMenu.alert', {
          defaultMessage: 'Alert',
        }),
        description: i18n.translate('workflows.actionsMenu.alertDescription', {
          defaultMessage: 'Start a workflow when an alert is triggered.',
        }),
        iconType: 'bell',
        isGroupLabel: false,
      },
      {
        id: 'scheduled',
        label: i18n.translate('workflows.actionsMenu.schedule', {
          defaultMessage: 'Schedule',
        }),
        description: i18n.translate('workflows.actionsMenu.scheduleDescription', {
          defaultMessage: 'Start a workflow on a schedule.',
        }),
        iconType: 'clock',
        isGroupLabel: false,
      },
    ],
  };
  const kibanaGroup: ActionOptionData = {
    iconType: 'logoKibana',
    id: 'kibana',
    label: i18n.translate('workflows.actionsMenu.kibana', {
      defaultMessage: 'Kibana',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaDescription', {
      defaultMessage: 'Work with Kibana data and features directly from your workflow.',
    }),
    isGroupLabel: false,
  };
  const externalGroup: ActionOptionData = {
    iconType: 'globe',
    id: 'external',
    label: i18n.translate('workflows.actionsMenu.external', {
      defaultMessage: 'External Systems & Apps',
    }),
    description: i18n.translate('workflows.actionsMenu.externalDescription', {
      defaultMessage: 'Automate actions in external systems and apps.',
    }),
    isGroupLabel: false,
  };
  const flowControlGroup: ActionOptionData = {
    iconType: 'branch',
    id: 'flowControl',
    label: i18n.translate('workflows.actionsMenu.aggregations', {
      defaultMessage: 'Flow Control',
    }),
    description: i18n.translate('workflows.actionsMenu.flowControlDescription', {
      defaultMessage: 'Control your workflow with logic, delays, looping, and more.',
    }),
    isGroupLabel: false,
    options: [
      {
        id: 'if',
        label: i18n.translate('workflows.actionsMenu.if', {
          defaultMessage: 'If',
        }),
        description: i18n.translate('workflows.actionsMenu.ifDescription', {
          defaultMessage: 'If the condition is true, the action is executed.',
        }),
        iconType: 'branch',
        isGroupLabel: false,
      },
      {
        id: 'loop',
        label: i18n.translate('workflows.actionsMenu.loop', {
          defaultMessage: 'Loop',
        }),
        description: i18n.translate('workflows.actionsMenu.loopDescription', {
          defaultMessage: 'Iterate the action over a specified list.',
        }),
        iconType: 'refresh',
        isGroupLabel: false,
      },
      {
        id: 'wait',
        label: i18n.translate('workflows.actionsMenu.wait', {
          defaultMessage: 'Wait',
        }),
        description: i18n.translate('workflows.actionsMenu.waitDescription', {
          defaultMessage: 'Wait for a specified amount of time before continuing.',
        }),
        iconType: 'clock',
        isGroupLabel: false,
      },
    ],
  };
  const elasticSearchGroup: ActionOptionData = {
    iconType: 'logoElasticsearch',
    id: 'elasticsearch',
    label: i18n.translate('workflows.actionsMenu.elasticsearch', {
      defaultMessage: 'Elasticsearch',
    }),
    description: i18n.translate('workflows.actionsMenu.elasticsearchDescription', {
      defaultMessage: 'Work with Elastic data and features directly from your workflow.',
    }),
    isGroupLabel: false,
  };

  for (const connector of connectors) {
    if (connector.type.startsWith('elasticsearch.')) {
      if (!elasticSearchGroup.options) {
        elasticSearchGroup.options = [];
      }
      elasticSearchGroup.options.push({
        id: connector.type,
        label: connector.type,
        description: connector.description,
        iconType: 'logoElasticsearch',
        isGroupLabel: false,
      });
    } else if (connector.type.startsWith('kibana.')) {
      if (!kibanaGroup.options) {
        kibanaGroup.options = [];
      }
      kibanaGroup.options.push({
        id: connector.type,
        label: connector.type,
        description: connector.description,
        iconType: 'logoKibana',
        isGroupLabel: false,
      });
    } else {
      if (!externalGroup.options) {
        externalGroup.options = [];
      }
      let iconType = 'globe';
      if (connector.type === 'slack') {
        iconType = 'logoSlack';
      } else if (connector.type === 'console') {
        iconType = 'console';
      } else if (connector.type.startsWith('inference.')) {
        iconType = 'sparkles';
      }
      externalGroup.options.push({
        id: connector.type,
        label: connector.type,
        description: connector.description,
        iconType,
        isGroupLabel: false,
      });
    }
  }

  return [triggersGroup, elasticSearchGroup, kibanaGroup, externalGroup, flowControlGroup];
}

const defaultOptions = getActionOptions();
const flatOptions = defaultOptions.map((option) => [option, ...(option.options || [])]).flat();

export function ActionsMenu({ onActionSelected }: ActionsMenuProps) {
  const styles = useMemoCss(componentStyles);
  const [options, setOptions] =
    useState<Array<EuiSelectableOption<ActionOptionData>>>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<Array<string>>([]);
  const renderActionOption = (
    option: EuiSelectableOption<ActionOptionData>,
    searchValue: string
  ) => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type={option.iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued" className="eui-displayBlock">
              <small>
                <EuiHighlight search={searchValue}>{option.description || ''}</EuiHighlight>
              </small>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  };

  const handleChange = (
    opts: Array<EuiSelectableOption<ActionOptionData>>,
    event: any,
    selectedOption: EuiSelectableOption<ActionOptionData>
  ) => {
    if (selectedOption?.options) {
      setCurrentPath([...currentPath, selectedOption.id]);
      setOptions(selectedOption.options);
    } else {
      onActionSelected(selectedOption);
    }
  };

  const handleBack = () => {
    const nextPath = currentPath.slice(0, -1);
    let nextOptions: ActionOptionData[] = defaultOptions;
    for (const id of nextPath) {
      nextOptions = nextOptions.find((option) => option.id === id)?.options || [];
    }
    setCurrentPath(nextPath);
    setOptions(nextOptions);
  };

  const handleSearchChange = (
    searchValue: string,
    matchingOptions: Array<EuiSelectableOption<ActionOptionData>>
  ) => {
    if (searchValue.length > 0) {
      setOptions(
        flatOptions.filter((option) =>
          option.label.toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    } else {
      setOptions(defaultOptions);
    }
  };

  return (
    <EuiSelectable
      aria-label="Selectable example with custom list items"
      searchable
      options={options}
      onChange={handleChange}
      searchProps={{
        id: 'actions-menu-search',
        name: 'actions-menu-search',
        onChange: handleSearchChange,
      }}
      listProps={{
        rowHeight: 50,
        showIcons: false,
      }}
      renderOption={renderActionOption}
      singleSelection
    >
      {(list, search) => (
        <>
          <EuiFlexGroup direction="column" gutterSize="s" css={styles.header}>
            <EuiFlexItem css={styles.title}>
              <EuiTitle size="xxs">
                {currentPath.length === 0 ? (
                  <h3>
                    <FormattedMessage
                      id="workflows.actionsMenu.selectAction"
                      defaultMessage="Select an action"
                    />
                  </h3>
                ) : (
                  <EuiButtonEmpty onClick={handleBack} iconType="arrowLeft" size="xs">
                    <FormattedMessage id="workflows.actionsMenu.back" defaultMessage="Back" />
                  </EuiButtonEmpty>
                )}
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>{search}</EuiFlexItem>
          </EuiFlexGroup>

          {list}
        </>
      )}
    </EuiSelectable>
  );
}

const componentStyles = {
  title: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'flex-start',
      // to avoid layout shift when the header is button
      minHeight: '24px',
    }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
};
