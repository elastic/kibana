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
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  DataDefinitionRegistryPublicStart,
  EsqlQueryDefinition,
} from '@kbn/data-definition-registry-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getKqlFromESQLQuery } from '@kbn/esql-utils/src/utils/query_parsing_helpers';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ESQLEditorDeps } from '../types';

export function EsqlSuggestedQueries({
  dataDefinitionRegistry,
  query,
  timeRange,
  onQueryClick,
}: {
  dataDefinitionRegistry: DataDefinitionRegistryPublicStart;
  query: string;
  timeRange?: TimeRange;
  onQueryClick: (query: string) => void;
}) {
  const {
    services: {},
  } = useKibana<ESQLEditorDeps>();
  const [suggestedQueries, setSuggestedQueries] = useState<EsqlQueryDefinition[]>();

  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState(false);

  const controllerRef = useRef(new AbortController());

  const { euiTheme } = useEuiTheme();

  const updateSuggestedQueriesDebounced = useMemo(() => {
    return debounce((options: { query: string; timeRange?: TimeRange }) => {
      controllerRef.current.abort();
      controllerRef.current = new AbortController();

      const index = getIndexPatternFromESQLQuery(options.query);
      const kql = getKqlFromESQLQuery(options.query);

      setLoading(true);

      dataDefinitionRegistry
        .getQueries({
          start: options.timeRange?.from || 'now-15m',
          end: options.timeRange?.to || 'now',
          index,
          signal: controllerRef.current.signal,
          kuery: kql,
        })
        .then((definitions) => {
          setSuggestedQueries(definitions);
        })
        .catch((err) => {
          setError(err);
          setSuggestedQueries([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);
  }, [dataDefinitionRegistry]);

  useEffect(() => {
    updateSuggestedQueriesDebounced({
      query,
      timeRange,
    });
  }, [query, timeRange, updateSuggestedQueriesDebounced]);

  const displayMax = 3;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow={false}>
        {loading ? <EuiLoadingSpinner /> : error ? <EuiIcon type="alert" color="danger" /> : null}
      </EuiFlexItem>
      {suggestedQueries?.length ? (
        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="xs">
            {suggestedQueries.slice(0, displayMax).map((definition) => {
              return (
                <EuiToolTip content={definition.query}>
                  <EuiButton
                    color="text"
                    size="s"
                    onClick={() => {
                      onQueryClick(definition.query);
                    }}
                    iconType="starFilled"
                    iconSize="s"
                  >
                    <EuiText size="xs">{definition.description}</EuiText>
                  </EuiButton>
                </EuiToolTip>
              );
            })}
            {suggestedQueries.length >= displayMax ? (
              <EuiPopover
                isOpen={isPopoverOpen}
                button={
                  <EuiButtonEmpty
                    color="text"
                    onClick={() => setIsPopoverOpen((prev) => !prev)}
                    size="s"
                    iconType="plusInCircleFilled"
                    iconSize="s"
                  >
                    <EuiText size="xs">
                      {i18n.translate('esqlEditor.query.suggestedQueries.more', {
                        defaultMessage: 'More',
                      })}
                    </EuiText>
                  </EuiButtonEmpty>
                }
                closePopover={() => setIsPopoverOpen(false)}
              >
                <EuiSelectable
                  searchable
                  css={css`
                    width: 400px;
                  `}
                  searchProps={{
                    compressed: true,
                    placeholder: i18n.translate(
                      'esqlEditor.query.suggestedQueries.searchQueriesPlaceholder',
                      {
                        defaultMessage: 'Search suggested queries',
                      }
                    ),
                  }}
                  singleSelection
                  options={suggestedQueries.map((definition) => {
                    return {
                      css: css`
                        .euiSelectableListItem__icon {
                          display: none;
                        }
                      `,
                      label: definition.description,
                      onClick: () => {
                        onQueryClick(definition.query);
                        setIsPopoverOpen(false);
                      },
                    };
                  })}
                >
                  {(list, search) => (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {search}
                      {list}
                    </EuiFlexGroup>
                  )}
                </EuiSelectable>
              </EuiPopover>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
