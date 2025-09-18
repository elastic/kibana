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
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getAllConnectors } from '../../../../common/schema';
import type { ActionOptionData } from '../types';

export interface ActionsMenuProps {
  onActionSelected: (action: ActionOptionData) => void;
}

function getConnectorIconType(connectorType: string): string {
  if (connectorType.includes('.')) {
    const [base, _] = connectorType.split('.');
    connectorType = base;
  }
  if (connectorType === 'slack') {
    return 'logoSlack';
  } else if (connectorType === 'console') {
    return 'console';
  } else if (connectorType === 'inference') {
    return 'sparkles';
  }
  return 'globe';
}

function getActionOptions(euiTheme: UseEuiTheme['euiTheme']): ActionOptionData[] {
  const connectors = getAllConnectors();
  const triggersGroup: ActionOptionData = {
    iconType: 'menuDown',
    iconColor: euiTheme.colors.vis.euiColorVis6,
    id: 'triggers',
    label: i18n.translate('workflows.actionsMenu.triggers', {
      defaultMessage: 'Triggers',
    }),
    description: i18n.translate('workflows.actionsMenu.triggersDescription', {
      defaultMessage: 'Choose which event starts a workflow',
    }),
    options: [
      {
        id: 'manual',
        label: i18n.translate('workflows.actionsMenu.manual', {
          defaultMessage: 'Manual',
        }),
        description: i18n.translate('workflows.actionsMenu.manualDescription', {
          defaultMessage: 'Manually start from the UI',
        }),
        iconType: 'play',
        iconColor: 'success',
      },
      {
        id: 'alert',
        label: i18n.translate('workflows.actionsMenu.alert', {
          defaultMessage: 'Alert',
        }),
        description: i18n.translate('workflows.actionsMenu.alertDescription', {
          defaultMessage: 'When an alert from rule is created',
        }),
        iconType: 'bell',
        iconColor: euiTheme.colors.vis.euiColorVis6,
      },
      {
        id: 'scheduled',
        label: i18n.translate('workflows.actionsMenu.schedule', {
          defaultMessage: 'Schedule',
        }),
        description: i18n.translate('workflows.actionsMenu.scheduleDescription', {
          defaultMessage: 'On a schedule (e.g. every 10 minutes)',
        }),
        iconType: 'clock',
        iconColor: euiTheme.colors.textParagraph,
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
      defaultMessage: 'Work with Kibana data and features directly from your workflow',
    }),
  };
  const externalGroup: ActionOptionData = {
    iconType: 'globe',
    iconColor: euiTheme.colors.vis.euiColorVis0,
    id: 'external',
    label: i18n.translate('workflows.actionsMenu.external', {
      defaultMessage: 'External Systems & Apps',
    }),
    description: i18n.translate('workflows.actionsMenu.externalDescription', {
      defaultMessage: 'Automate actions in external systems and apps.',
    }),
  };
  const flowControlGroup: ActionOptionData = {
    iconType: 'branch',
    iconColor: euiTheme.colors.vis.euiColorVis0,
    id: 'flowControl',
    label: i18n.translate('workflows.actionsMenu.aggregations', {
      defaultMessage: 'Flow Control',
    }),
    description: i18n.translate('workflows.actionsMenu.flowControlDescription', {
      defaultMessage: 'Control your workflow with logic, delays, looping, and more',
    }),
    options: [
      {
        id: 'if',
        label: i18n.translate('workflows.actionsMenu.if', {
          defaultMessage: 'If Condition',
        }),
        description: i18n.translate('workflows.actionsMenu.ifDescription', {
          defaultMessage: 'Define condition with KQL to execute the action',
        }),
        iconType: 'branch',
        iconColor: euiTheme.colors.vis.euiColorVis0,
      },
      {
        id: 'loop',
        label: i18n.translate('workflows.actionsMenu.loop', {
          defaultMessage: 'Loop',
        }),
        description: i18n.translate('workflows.actionsMenu.loopDescription', {
          defaultMessage: 'Iterate the action over a specified list',
        }),
        iconType: 'refresh',
        iconColor: euiTheme.colors.vis.euiColorVis0,
      },
      {
        id: 'wait',
        label: i18n.translate('workflows.actionsMenu.wait', {
          defaultMessage: 'Wait',
        }),
        description: i18n.translate('workflows.actionsMenu.waitDescription', {
          defaultMessage: 'Pause for a specified amount of time before continuing',
        }),
        iconType: 'clock',
        iconColor: euiTheme.colors.vis.euiColorVis0,
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
      defaultMessage: 'Work with Elastic data and features directly from your workflow',
    }),
  };

  for (const connector of connectors) {
    if (connector.type.startsWith('elasticsearch.')) {
      if (!elasticSearchGroup.options) {
        elasticSearchGroup.options = [];
      }
      elasticSearchGroup.options.push({
        id: connector.type,
        label: connector.description || connector.type,
        description: connector.type,
        iconType: 'logoElasticsearch',
      });
    } else if (connector.type.startsWith('kibana.')) {
      if (!kibanaGroup.options) {
        kibanaGroup.options = [];
      }
      kibanaGroup.options.push({
        id: connector.type,
        label: connector.description || connector.type,
        description: connector.type,
        iconType: 'logoKibana',
      });
    } else {
      if (!externalGroup.options) {
        externalGroup.options = [];
      }
      const [baseType, subtype] = connector.type.split('.');
      let groupOption = externalGroup;
      if (subtype) {
        let connectorGroup = externalGroup.options.find((option) => option.id === baseType);
        // create a group for the basetype if not yet exists
        if (!connectorGroup) {
          connectorGroup = {
            id: baseType,
            label: baseType,
            iconType: getConnectorIconType(baseType),
            options: [],
          };
          externalGroup.options.push(connectorGroup);
        }
        groupOption = connectorGroup;
      }
      const iconType = getConnectorIconType(connector.type);
      groupOption.options!.push({
        id: connector.type,
        label: connector.description || connector.type,
        description: connector.type,
        iconType,
      });
    }
  }

  return [triggersGroup, elasticSearchGroup, kibanaGroup, externalGroup, flowControlGroup];
}

export function ActionsMenu({ onActionSelected }: ActionsMenuProps) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const defaultOptions = useMemo(() => getActionOptions(euiTheme), [euiTheme]);
  const flatOptions = useMemo(
    () => defaultOptions.map((option) => [option, ...(option.options || [])]).flat(),
    [defaultOptions]
  );

  const [options, setOptions] = useState<ActionOptionData[]>(defaultOptions);
  const [currentPath, setCurrentPath] = useState<Array<string>>([]);
  const renderActionOption = (option: ActionOptionData, searchValue: string) => {
    return (
      <EuiFlexGroup alignItems="center" css={styles.actionOption}>
        <EuiFlexItem
          grow={false}
          css={[styles.iconOuter, option.options ? styles.groupIconOuter : styles.actionIconOuter]}
        >
          <span css={option.options ? styles.groupIconInner : styles.actionIconInner}>
            <EuiIcon type={option.iconType} size="m" color={option?.iconColor} />
          </span>
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="xxxs" css={styles.actionTitle}>
              <h6>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
              </h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" className="eui-displayBlock" css={styles.actionDescription}>
              <EuiHighlight search={searchValue}>{option.description || ''}</EuiHighlight>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  };

  const handleChange = (
    opts: Array<ActionOptionData>,
    event: any,
    selectedOption: ActionOptionData
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

  const handleSearchChange = (searchValue: string, matchingOptions: Array<ActionOptionData>) => {
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
      options={options as EuiSelectableOption<ActionOptionData>[]}
      onChange={handleChange}
      searchProps={{
        id: 'actions-menu-search',
        name: 'actions-menu-search',
        onChange: handleSearchChange,
      }}
      listProps={{
        rowHeight: 64,
        showIcons: false,
      }}
      renderOption={renderActionOption}
      css={styles.selectable}
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
                  <EuiButtonEmpty
                    onClick={handleBack}
                    iconType="arrowLeft"
                    size="xs"
                    aria-label={i18n.translate('workflows.actionsMenu.back', {
                      defaultMessage: 'Back',
                    })}
                  >
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
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& .euiSelectableListItem': {
        paddingBlock: euiTheme.size.m,
        paddingInline: '16px',
      },
    }),
  title: css({
    display: 'flex',
    alignItems: 'flex-start',
    // to avoid layout shift when the header is button
    minHeight: '24px',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  actionOption: css({
    gap: '12px',
  }),
  iconOuter: css({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  groupIconOuter: ({ euiTheme }: UseEuiTheme) =>
    css({
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      borderRadius: euiTheme.border.radius.medium,
    }),
  actionIconOuter: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      borderRadius: '100%',
    }),
  groupIconInner: ({ euiTheme }: UseEuiTheme) => css({}),
  actionIconInner: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '24px',
      height: '24px',
      borderRadius: '100%',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  actionTitle: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      '&::first-letter': {
        textTransform: 'capitalize',
      },
    }),
  actionDescription: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
    }),
};
