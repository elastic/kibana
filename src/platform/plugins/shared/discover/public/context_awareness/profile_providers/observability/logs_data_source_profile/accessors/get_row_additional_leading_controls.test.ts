/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type {
  RowControlColumn,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/discover-utils';
import { BehaviorSubject } from 'rxjs';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { DataSourceCategory } from '../../../../profiles';
import type { LogOverviewContext } from '../profile';
import { getRowAdditionalLeadingControls } from './get_row_additional_leading_controls';

const DEGRADED_DOCS_CONTROL_ID = 'connectedDegradedDocs';
const STACKTRACE_CONTROL_ID = 'connectedStacktraceDocs';

const record = buildDataTableRecord(
  {
    _id: 'doc-1',
    _index: 'logs-synth.docviewer-default',
    _ignored: ['log.level'],
    fields: {
      '@timestamp': ['2025-01-01T00:00:00.000Z'],
      'error.stack_trace': ['Error: boom'],
    },
  },
  dataViewMock
);

const rowProps: RowControlRowProps = { rowIndex: 0, record };

// The controls are only ever rendered by the data grid, so the accessor's wiring is reachable
// through the element each `render` returns rather than through the DOM.
const noopControl = (() => null) as RowControlComponent;
const getOnClick = (control: RowControlColumn) =>
  control.render(noopControl, rowProps).props.onClick as (props: RowControlRowProps) => void;

const findControl = (controls: RowControlColumn[] | undefined, id: string) => {
  const control = controls?.find((candidate) => candidate.id === id);
  if (!control) {
    throw new Error(`Expected a control with id '${id}'`);
  }
  return control;
};

const setup = ({
  setExpandedDoc,
  query,
}: {
  setExpandedDoc?: jest.Mock;
  query?: { esql: string } | { query: string; language: string };
} = {}) => {
  const logOverviewContext$ = new BehaviorSubject<LogOverviewContext | undefined>(undefined);

  // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
  const controls = getRowAdditionalLeadingControls!(() => [], {
    context: { category: DataSourceCategory.Logs, logOverviewContext$ },
    toolkit: { ...EMPTY_CONTEXT_AWARENESS_TOOLKIT, actions: { setExpandedDoc } },
  })({
    dataView: dataViewMock,
    query: query ?? { query: '', language: 'kuery' },
  }) as RowControlColumn[] | undefined;

  return { controls, logOverviewContext$ };
};

const clickTargets = [
  { controlId: DEGRADED_DOCS_CONTROL_ID, section: 'quality_issues' },
  { controlId: STACKTRACE_CONTROL_ID, section: 'stacktrace' },
] as const;

const degradedDocsGating = [
  { esql: 'FROM logs-* | LIMIT 10', requests: 'does not request', enabled: false },
  { esql: 'FROM logs-* METADATA _ignored | LIMIT 10', requests: 'requests', enabled: true },
] as const;

describe('getRowAdditionalLeadingControls (logs)', () => {
  clickTargets.forEach(({ controlId, section }) => {
    it(`queues the ${section} section and opens the log overview tab when its control is clicked`, () => {
      const setExpandedDoc = jest.fn();
      const { controls, logOverviewContext$ } = setup({ setExpandedDoc });

      getOnClick(findControl(controls, controlId))(rowProps);

      expect(logOverviewContext$.getValue()).toEqual({
        recordId: record.id,
        initialAccordionSection: section,
      });
      expect(setExpandedDoc).toHaveBeenCalledWith(record, {
        initialTabId: 'doc_view_logs_overview',
      });
    });
  });

  degradedDocsGating.forEach(({ esql, requests, enabled }) => {
    it(`${
      enabled ? 'enables' : 'disables'
    } quality-issue detection for an ES|QL query that ${requests} _ignored`, () => {
      const { controls } = setup({ setExpandedDoc: jest.fn(), query: { esql } });

      const element = findControl(controls, DEGRADED_DOCS_CONTROL_ID).render(noopControl, rowProps);

      expect(element.props.enabled).toBe(enabled);
    });
  });
});
