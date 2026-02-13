/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { getESQLSources } from '@kbn/esql-utils';
import type { ESQLEditorDeps } from '../types';
import { DataSourcesList } from './datasources_list';
import { generateIndexPatterns } from './utils';

const POPOVER_WIDTH = 350;

const sourcesDropdownCss = css`
  box-shadow: none;
  &:focus,
          &: focus-within,
          &:hover,
          &:active {
    box-shadow: none !important;
    outline: none !important;
  }
`;

const shrinkableContainerCss = css`
  min-width: 0;
  flex-direction: row;
`;

interface SourcesDropdownProps {
  // Currently selected data sources
  currentSources: string[];
  // Callback when the selected data sources change
  onChangeSources: (newSources: string[]) => void;
}

export function SourcesDropdown({ currentSources, onChangeSources }: SourcesDropdownProps) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [fetchedSources, setFetchedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const euiTheme = useEuiTheme();
  const isMounted = useMountedState();
  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const isFetchingSources = useRef(false);
  const hasAutoSelectedDefaultSource = useRef(false);

  const kibana = useKibana<ESQLEditorDeps>();
  const { core } = kibana.services;
  const getLicense = kibana.services?.esql?.getLicense;

  useEffect(() => {
    if (fetchedSources.length > 0 || isFetchingSources.current) {
      return;
    }

    isFetchingSources.current = true;
    let cancelled = false;

    const fetchSources = async () => {
      const sources = await getESQLSources(core, getLicense);
      if (cancelled || !isMounted()) {
        return;
      }

      const sourceNames = sources.filter((source) => !source.hidden).map((source) => source.name);
      // Generate dash patterns from the source names
      const dashPatterns = generateIndexPatterns(sourceNames);

      const allOptions = [
        ...dashPatterns.map((pattern) => ({ label: pattern })),
        ...sourceNames.map((name) => ({ label: name })),
      ];
      setFetchedSources(allOptions);
    };

    fetchSources().finally(() => {
      isFetchingSources.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [core, fetchedSources.length, getLicense, isMounted]);

  useEffect(() => {
    if (hasAutoSelectedDefaultSource.current || fetchedSources.length === 0) {
      return;
    }
    hasAutoSelectedDefaultSource.current = true;

    if (!currentSources.length) {
      onChangeSources([fetchedSources[0].label]);
    }
  }, [currentSources.length, fetchedSources, onChangeSources]);

  const sourcesOptions = useMemo(() => {
    const existingLabels = new Set(fetchedSources.map((option) => option.label));
    const currentSourcesOptions = currentSources
      .filter((source) => !existingLabels.has(source))
      .map((source) => ({ label: source }));

    return [...fetchedSources, ...currentSourcesOptions];
  }, [fetchedSources, currentSources]);

  const createTrigger = function () {
    return (
      <EuiFormControlButton
        role="combobox"
        compressed
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
        css={sourcesDropdownCss}
        onClick={() => {
          setPopoverIsOpen(!isPopoverOpen);
        }}
      >
        {Boolean(currentSources.length) && (
          <EuiNotificationBadge color="subdued">{currentSources.length}</EuiNotificationBadge>
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
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="ESQLEditor-visor-sources-dropdown"
    >
      <>
        <EuiFlexItem grow={true} css={shrinkableContainerCss}>
          <EuiFormControlLayout compressed isDropdown fullWidth>
            <EuiPopover
              id={popoverId}
              button={createTrigger()}
              isOpen={isPopoverOpen}
              closePopover={() => setPopoverIsOpen(false)}
              panelPaddingSize="none"
              display="block"
              panelStyle={{ width: POPOVER_WIDTH }}
            >
              <EuiContextMenuPanel size="s" items={items} />
            </EuiPopover>
          </EuiFormControlLayout>
        </EuiFlexItem>
      </>
    </EuiFlexGroup>
  );
}
