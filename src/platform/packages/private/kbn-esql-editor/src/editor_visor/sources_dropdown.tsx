/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import useMountedState from 'react-use/lib/useMountedState';
import type { EuiComboBoxOptionOption, EuiContextMenuPanelProps } from '@elastic/eui';
import {
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlButton,
  EuiFormControlLayout,
  EuiNotificationBadge,
  EuiPopover,
  EuiText,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getESQLSources } from '../helpers';
import type { ESQLEditorDeps } from '../types';
import { DataSourcesList } from './datasources_list';
import { generateIndexPatterns } from './utils';

interface SourcesDropdownProps {
  // Currently selected data sources
  currentSources: string[];
  // Callback when the selected data sources change
  onChangeSources: (newSources: string[]) => void;
}
const DEFAULT_WIDTH = 350;

const shrinkableContainerCss = css`
  min-width: 0;
  flex-direction: row;
`;

export function SourcesDropdown({ currentSources, onChangeSources }: SourcesDropdownProps) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [sourcesOptions, setSourcesOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const euiTheme = useEuiTheme();
  const isMounted = useMountedState();
  const popoverId = useMemo(() => htmlIdGenerator()(), []);

  const kibana = useKibana<ESQLEditorDeps>();
  const { core } = kibana.services;
  const getLicense = kibana.services?.esql?.getLicense;

  useEffect(() => {
    async function fetchSources() {
      const sources = await getESQLSources(core, getLicense);
      if (isMounted()) {
        const sourceNames = sources.filter((source) => !source.hidden).map((source) => source.name);

        // Generate dash patterns from the source names
        const dashPatterns = generateIndexPatterns(sourceNames);

        const allOptions = [
          ...dashPatterns.map((pattern) => ({ label: pattern })),
          ...sourceNames.map((name) => ({ label: name })),
        ];

        setSourcesOptions(allOptions);
      }
    }
    if (sourcesOptions.length === 0) {
      fetchSources();
    }
  }, [core, getLicense, sourcesOptions.length, isMounted]);

  const createTrigger = function () {
    return (
      <EuiFormControlButton
        role="combobox"
        compressed
        style={{ maxWidth: DEFAULT_WIDTH }}
        title={currentSources.join(', ')}
        data-test-subj="visorSourcesDropdownButton"
        aria-expanded={isPopoverOpen}
        aria-controls={popoverId}
        value={
          <EuiFlexGroup
            component="span"
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={{ maxWidth: '100%' }}
          >
            <span className="eui-textTruncate">{currentSources.join(', ')}</span>
          </EuiFlexGroup>
        }
        css={css`
          box-shadow: none;
          &:focus,
          &: focus-within,
          &:hover,
          &:active {
            box-shadow: none !important;
            outline: none !important;
          }
        `}
        onClick={() => {
          setPopoverIsOpen(!isPopoverOpen);
        }}
      >
        {Boolean(currentSources.length) && (
          <EuiNotificationBadge color="accent">{currentSources.length}</EuiNotificationBadge>
        )}
      </EuiFormControlButton>
    );
  };

  const items = useMemo(() => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    panelItems.push(
      <React.Fragment key="datasources-list">
        <EuiText size="s" css={{ margin: euiTheme.euiTheme.size.s }}>
          <h5>
            {i18n.translate('esqlEditor.visor.dataSourcesLabel', {
              defaultMessage: 'Data sources',
            })}
          </h5>
        </EuiText>
        <DataSourcesList
          currentSources={currentSources}
          onChangeDatasources={onChangeSources}
          sourcesList={sourcesOptions.map((option) => option.label)}
        />
      </React.Fragment>
    );

    return panelItems;
  }, [currentSources, euiTheme.euiTheme.size.s, onChangeSources, sourcesOptions]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <>
        <EuiFlexItem grow={true} css={shrinkableContainerCss}>
          <EuiFormControlLayout compressed isDropdown>
            <EuiPopover
              id={popoverId}
              panelClassName="changeDatasourcePopover"
              button={createTrigger()}
              panelProps={{
                ['data-test-subj']: 'changeDatasourcePopover',
              }}
              isOpen={isPopoverOpen}
              closePopover={() => setPopoverIsOpen(false)}
              panelPaddingSize="none"
              display="block"
            >
              <div style={{ minWidth: DEFAULT_WIDTH }}>
                <EuiContextMenuPanel size="s" items={items} />
              </div>
            </EuiPopover>
          </EuiFormControlLayout>
        </EuiFlexItem>
      </>
    </EuiFlexGroup>
  );
}
