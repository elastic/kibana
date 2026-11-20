/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import {
  EuiBasicTable,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getClientErrorMessage } from '@kbn/as-code-import-flyout-component';
import type { ExportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import { exportReferencedObjectsStrings as strings } from './_export_referenced_objects_strings';

type ExportedObject = ExportReferencedObjectsResponse['objects'][number];
type ExportProblem = ExportReferencedObjectsResponse['problems'][number];

interface ExportReferencedObjectsFlyoutProps {
  /** The saved dashboards to export; empty while the open dashboard has never been saved. */
  dashboardIds: string[];
  titleId: string;
  closeFlyout: () => void;
  exportDashboards: (ids: string[]) => Promise<ExportReferencedObjectsResponse>;
  downloadExport: (filename: string, content: string) => void;
}

type ExportState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; response: ExportReferencedObjectsResponse };

const getObjectTitle = ({
  id,
  data: { title, name, index_pattern: indexPattern },
}: ExportedObject): string =>
  [title, name, indexPattern].find(
    (label): label is string => typeof label === 'string' && label.length > 0
  ) ?? id;

const groupProblemsByRoot = (problems: ExportProblem[]): Map<string, ExportProblem[]> => {
  const byRoot = new Map<string, ExportProblem[]>();
  problems.forEach((problem) =>
    problem.roots.forEach((root) => byRoot.set(root, [...(byRoot.get(root) ?? []), problem]))
  );
  return byRoot;
};

export const ExportReferencedObjectsFlyout = ({
  dashboardIds,
  titleId,
  closeFlyout,
  exportDashboards,
  downloadExport,
}: ExportReferencedObjectsFlyoutProps) => {
  const [state, setState] = useState<ExportState>({ status: 'loading' });

  useEffect(() => {
    if (dashboardIds.length === 0) return;
    let ignore = false;
    exportDashboards(dashboardIds).then(
      (response) => !ignore && setState({ status: 'loaded', response }),
      (error) =>
        !ignore &&
        setState({
          status: 'error',
          message: getClientErrorMessage(error) ?? strings.getGenericErrorText(),
        })
    );
    return () => {
      ignore = true;
    };
  }, [dashboardIds, exportDashboards]);

  const response = state.status === 'loaded' ? state.response : undefined;
  const dashboardsById = new Map(
    (response?.objects ?? [])
      .filter(({ type }) => type === DASHBOARD_SAVED_OBJECT_TYPE)
      .map((object) => [object.id, object])
  );

  const renderBody = () => {
    if (dashboardIds.length === 0) {
      return (
        <KbnWarningCallout
          title={strings.getUnsavedTitle()}
          data-test-subj="exportReferencedObjectsUnsaved"
        >
          {strings.getUnsavedText()}
        </KbnWarningCallout>
      );
    }
    if (state.status === 'loading') {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner
              size="xl"
              aria-label={strings.getLoadingLabel()}
              data-test-subj="exportReferencedObjectsLoading"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (state.status === 'error') {
      return (
        <KbnDangerCallout
          title={strings.getErrorTitle()}
          data-test-subj="exportReferencedObjectsError"
        >
          {state.message}
        </KbnDangerCallout>
      );
    }

    const { objects, problems } = state.response;
    return (
      <>
        <EuiText size="s">
          <p>{strings.getObjectsSummary(objects.length)}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<ExportedObject>
          tableCaption={strings.getObjectsTableCaption()}
          items={objects}
          rowHeader="id"
          columns={[
            { field: 'type', name: strings.getTypeColumnName() },
            {
              name: strings.getTitleColumnName(),
              render: (object: ExportedObject) => getObjectTitle(object),
            },
            { field: 'id', name: strings.getIdColumnName() },
          ]}
          data-test-subj="exportReferencedObjectsTable"
        />
        {problems.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              title={strings.getProblemsTitle(problems.length)}
              data-test-subj="exportReferencedObjectsProblems"
            >
              {[...groupProblemsByRoot(problems)].map(([root, rootProblems]) => {
                const rootObject = dashboardsById.get(root);
                return (
                  <div key={root} data-test-subj={`exportReferencedObjectsProblems-${root}`}>
                    <EuiTitle size="xxs">
                      <h3>{rootObject ? getObjectTitle(rootObject) : root}</h3>
                    </EuiTitle>
                    <ul>
                      {rootProblems.map(({ type, id, message }, index) => (
                        // Problems can repeat, such as one per dropped panel of the same type.
                        <li key={index}>{strings.getProblemText({ type, id, message })}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </KbnWarningCallout>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{strings.getFlyoutTitle()}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBetaBadge
          label={strings.getTechnicalPreviewLabel()}
          tooltipContent={strings.getTechnicalPreviewTooltip()}
          size="s"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="exportReferencedObjectsClose">
              {strings.getCloseButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="download"
              isDisabled={!response || response.objects.length === 0}
              onClick={() => {
                if (!response) return;
                // One root names the file; several share a generic name.
                const rootTitle =
                  dashboardIds.length === 1 ? dashboardsById.get(dashboardIds[0]) : undefined;
                downloadExport(
                  `${rootTitle ? getObjectTitle(rootTitle) : 'export'}.json`,
                  JSON.stringify(response, null, 2)
                );
              }}
              data-test-subj="exportReferencedObjectsDownload"
            >
              {strings.getDownloadButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
