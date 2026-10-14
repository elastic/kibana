/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AggregateQuery } from '@kbn/es-query';
import { copyToClipboard } from '@elastic/eui';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { DiscoverTestProvider } from '../../../../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../../../../__mocks__/services';
import type { ESQLDataGroupNode } from './types';
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeRowActionHelpers,
} from './use_row_header_components';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

const services = createDiscoverServicesMock();

const TestProvider = ({ children }: PropsWithChildren) => (
  <DiscoverTestProvider services={services}>{children}</DiscoverTestProvider>
);

const queryMeta: ESQLStatsQueryMeta = {
  groupByFields: [{ field: 'category', type: 'column' }],
  appliedFunctions: [{ identifier: 'host', aggregation: 'values' }],
};

const rowData: ESQLDataGroupNode = {
  id: 'row-1',
  groupColumn: 'category',
  groupValue: 'category-a',
  aggregatedValues: {
    host: [0, '', 'host-1'],
  },
};

const TestComponent = () => {
  const { rowHeaderMeta } = useEsqlDataCascadeRowHeaderComponents(
    queryMeta,
    ['host'],
    function () {},
    new Map([['host', 'array']])
  );

  return rowHeaderMeta({ rowDepth: 0, rowData, nodePath: ['category'] });
};

describe('useEsqlDataCascadeRowHeaderComponents', () => {
  it('renders numeric zero values in array aggregations without losing blank placeholders', () => {
    render(<TestComponent />, { wrapper: TestProvider });

    expect(screen.getByText('0, (blank), host-1')).toBeInTheDocument();
  });

  describe('rowHeaderTitle', () => {
    const RowHeaderTitleTestComponent = ({
      titleQueryMeta,
      titleRowData,
      nodePath,
    }: {
      titleQueryMeta: ESQLStatsQueryMeta;
      titleRowData: ESQLDataGroupNode;
      nodePath: string[];
    }) => {
      const { rowHeaderTitle } = useEsqlDataCascadeRowHeaderComponents(
        titleQueryMeta,
        [],
        function () {},
        new Map()
      );

      return <>{rowHeaderTitle({ rowData: titleRowData, nodePath })}</>;
    };

    it('renders the pattern cell renderer for a categorize-grouped row', () => {
      const categorizeQueryMeta: ESQLStatsQueryMeta = {
        groupByFields: [{ field: 'Pattern', type: 'categorize' }],
        appliedFunctions: [],
      };
      const categorizeRowData: ESQLDataGroupNode = {
        id: 'row-pattern',
        groupColumn: 'Pattern',
        groupValue: 'user .* logged in',
        aggregatedValues: {},
      };

      render(
        <RowHeaderTitleTestComponent
          titleQueryMeta={categorizeQueryMeta}
          titleRowData={categorizeRowData}
          nodePath={['Pattern']}
        />,
        { wrapper: TestProvider }
      );

      expect(
        screen.getByTestId('row-pattern-dscCascadeRowTitlePatternCellRenderer')
      ).toBeInTheDocument();
    });

    it('renders plain text (not the pattern cell renderer) for a non-categorize-grouped row', () => {
      render(
        <RowHeaderTitleTestComponent
          titleQueryMeta={queryMeta}
          titleRowData={rowData}
          nodePath={['category']}
        />,
        { wrapper: TestProvider }
      );

      expect(screen.getByText('category-a')).toBeInTheDocument();
      expect(
        screen.queryByTestId('row-1-dscCascadeRowTitlePatternCellRenderer')
      ).not.toBeInTheDocument();
    });
  });
});

describe('useEsqlDataCascadeRowActionHelpers', () => {
  const dataView = createStubDataView({ spec: {} });

  const RowActionsTestComponent = ({
    editorQuery,
    openInNewTab,
    updateESQLQuery,
    groupId = 'clientip',
    groupValue = '192.168.1.1',
    esqlVariables,
  }: {
    editorQuery: AggregateQuery;
    openInNewTab: (...args: unknown[]) => Promise<void>;
    updateESQLQuery: (...args: unknown[]) => void;
    groupId?: string;
    groupValue?: string;
    esqlVariables?: ESQLControlVariable[];
  }) => {
    const { renderRowActionPopover, togglePopover } = useEsqlDataCascadeRowActionHelpers({
      dataView,
      esqlVariables,
      editorQuery,
      statsFieldSummary: undefined,
      updateESQLQuery,
      openInNewTab,
    });

    return (
      <div>
        <button onClick={togglePopover.bind({ groupId, groupValue })}>toggle row actions</button>
        {renderRowActionPopover()}
      </div>
    );
  };

  const openRowActionsMenu = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByText('toggle row actions'));
    return screen.findByTestId('dscCascadeRowContextActionMenu');
  };

  it('copies the row group value to the clipboard when "Copy to clipboard" is clicked', async () => {
    const editorQuery: AggregateQuery = {
      esql: 'FROM logstash-* | STATS count = COUNT(bytes) BY clientip',
    };
    const updateESQLQuery = jest.fn();
    const openInNewTab = jest.fn();

    render(
      <RowActionsTestComponent
        editorQuery={editorQuery}
        openInNewTab={openInNewTab}
        updateESQLQuery={updateESQLQuery}
      />,
      { wrapper: TestProvider }
    );

    await openRowActionsMenu();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('dscCascadeRowContextActionCopyToClipboard'));

    expect(copyToClipboard).toHaveBeenCalledWith('192.168.1.1');
    expect(screen.queryByTestId('dscCascadeRowContextActionMenu')).not.toBeInTheDocument();
  });

  it('calls updateESQLQuery with a "filter in" clause appended when "Filter in" is clicked', async () => {
    const editorQuery: AggregateQuery = {
      esql: 'FROM logstash-* | STATS count = COUNT(bytes) BY ??field',
    };
    const esqlVariables: ESQLControlVariable[] = [
      { key: 'field', type: ESQLVariableType.FIELDS, value: 'clientip' },
    ];
    const updateESQLQuery = jest.fn();
    const openInNewTab = jest.fn();

    render(
      <RowActionsTestComponent
        editorQuery={editorQuery}
        esqlVariables={esqlVariables}
        groupId="??field"
        openInNewTab={openInNewTab}
        updateESQLQuery={updateESQLQuery}
      />,
      { wrapper: TestProvider }
    );

    await openRowActionsMenu();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('dscCascadeRowContextActionFilterIn'));

    expect(updateESQLQuery).toHaveBeenCalledWith(
      'FROM logstash-* | WHERE clientip == "192.168.1.1" | STATS count = COUNT(bytes) BY ??field'
    );
    expect(screen.queryByTestId('dscCascadeRowContextActionMenu')).not.toBeInTheDocument();
  });

  it('calls updateESQLQuery with a "filter out" clause appended when "Filter out" is clicked', async () => {
    const editorQuery: AggregateQuery = {
      esql: 'FROM logstash-* | STATS count = COUNT(bytes) BY ??field',
    };
    const esqlVariables: ESQLControlVariable[] = [
      { key: 'field', type: ESQLVariableType.FIELDS, value: 'clientip' },
    ];
    const updateESQLQuery = jest.fn();
    const openInNewTab = jest.fn();

    render(
      <RowActionsTestComponent
        editorQuery={editorQuery}
        esqlVariables={esqlVariables}
        groupId="??field"
        openInNewTab={openInNewTab}
        updateESQLQuery={updateESQLQuery}
      />,
      { wrapper: TestProvider }
    );

    await openRowActionsMenu();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('dscCascadeRowContextActionFilterOut'));

    expect(updateESQLQuery).toHaveBeenCalledWith(
      'FROM logstash-* | WHERE clientip != "192.168.1.1" | STATS count = COUNT(bytes) BY ??field'
    );
    expect(screen.queryByTestId('dscCascadeRowContextActionMenu')).not.toBeInTheDocument();
  });

  it('opens a new tab with a rewritten MATCH query when "Open in new tab" is clicked for a CATEGORIZE grouping', async () => {
    const editorQuery: AggregateQuery = {
      esql: 'FROM logstash-* | STATS count = COUNT(bytes) BY CATEGORIZE(message)',
    };
    const updateESQLQuery = jest.fn();
    const openInNewTab = jest.fn();

    render(
      <RowActionsTestComponent
        editorQuery={editorQuery}
        openInNewTab={openInNewTab}
        updateESQLQuery={updateESQLQuery}
        groupId="CATEGORIZE(message)"
        groupValue="some random pattern"
      />,
      { wrapper: TestProvider }
    );

    await openRowActionsMenu();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('dscCascadeRowContextActionOpenInNewTab'));

    expect(openInNewTab).toHaveBeenCalledWith({
      appState: {
        query: {
          esql: 'FROM logstash-* | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})',
        },
      },
    });
  });
});
