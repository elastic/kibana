/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSelect,
  EuiSuperDatePicker,
  EuiSuperDatePickerProps,
  EuiTitle,
} from '@elastic/eui';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type {
  EmbeddableComponent as LensEmbeddableComponent,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { css } from '@emotion/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { getLensAttributes } from './lens_attributes';

export const GroupPreview = ({
  group,
  dataViews,
  LensEmbeddableComponent,
  searchSessionId,
  refreshSearchSession,
  timePickerQuickRanges,
}: {
  group: EventAnnotationGroupConfig;
  dataViews: DataView[];
  LensEmbeddableComponent: LensEmbeddableComponent;
  searchSessionId: string;
  refreshSearchSession: () => void;
  timePickerQuickRanges: Array<{ from: string; to: string; display: string }> | undefined;
}) => {
  const [chartTimeRange, setChartTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges?.map(
        ({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        }
      ) ?? [],
    [timePickerQuickRanges]
  );

  const customQuickSelectRender = useCallback<
    Required<EuiSuperDatePickerProps>['customQuickSelectRender']
  >(
    ({ quickSelect, commonlyUsedRanges: ranges, customQuickSelectPanels }) =>
      (
        <>
          {customQuickSelectPanels}
          {quickSelect}
          {ranges}
        </>
      ) as React.ReactNode,
    []
  );

  const currentDataView = useMemo(
    () => dataViews.find((dataView) => dataView.id === group.indexPatternId),
    [dataViews, group.indexPatternId]
  );

  const timeFieldNames = useMemo(
    () => currentDataView?.fields.getByType('date').map((field) => field.name) ?? [],
    [currentDataView?.fields]
  );

  // We can assume that there is at least one time field because we don't allow annotation groups to be created without one
  const defaultTimeFieldName = useMemo(
    () => currentDataView?.timeFieldName ?? timeFieldNames[0],
    [currentDataView?.timeFieldName, timeFieldNames]
  );

  const [currentTimeFieldName, setCurrentTimeFieldName] = useState<string>(defaultTimeFieldName);

  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes']>(
    getLensAttributes(group, currentTimeFieldName)
  );

  // we don't use currentDataView directly to hide/show the missing prompt because we want to delay
  // the embeddable render until the lensAttributes have been updated in useDebounce
  // in the case that the user selects a new data view
  const [showMissingDataViewPrompt, setShowMissingDataViewPrompt] = useState<boolean>(
    !currentDataView
  );

  useEffect(() => {
    setCurrentTimeFieldName(defaultTimeFieldName);
  }, [defaultTimeFieldName]);

  useDebounce(
    () => {
      setLensAttributes(getLensAttributes(group, currentTimeFieldName));
      setShowMissingDataViewPrompt(!currentDataView);
    },
    250,
    [group, currentTimeFieldName]
  );

  return (
    <>
      <EuiFlyoutHeader>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3
                css={css`
                  white-space: nowrap;
                `}
              >
                <FormattedMessage
                  id="eventAnnotationListing.groupPreview.preview"
                  defaultMessage="Preview"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              width: 336px;
              margin-top: -5px;
              margin-bottom: -5px;
            `}
            grow={false}
          >
            <EuiSuperDatePicker
              onTimeChange={({ start: from, end: to }) => setChartTimeRange({ from, to })}
              onRefresh={({ start: from, end: to }) => {
                setChartTimeRange({ from, to });
                refreshSearchSession();
              }}
              start={chartTimeRange.from}
              end={chartTimeRange.to}
              compressed
              commonlyUsedRanges={commonlyUsedRanges}
              updateButtonProps={{
                iconOnly: true,
                fill: false,
              }}
              customQuickSelectRender={customQuickSelectRender}
              customQuickSelectPanels={[
                {
                  title: i18n.translate('eventAnnotationListing.timeField', {
                    defaultMessage: 'Time field',
                  }),
                  content: (
                    <EuiSelect
                      aria-label={i18n.translate('eventAnnotationListing.timeField', {
                        defaultMessage: 'Time field',
                      })}
                      options={timeFieldNames.map((name) => ({
                        text: name,
                      }))}
                      value={currentTimeFieldName}
                      onChange={(e) => setCurrentTimeFieldName(e.target.value)}
                    />
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      >
        {!showMissingDataViewPrompt ? (
          <EuiFlexGroup
            css={css`
              height: 100%;
            `}
            direction="column"
            justifyContent="center"
          >
            <EuiFlexItem grow={0}>
              <div
                css={css`
                  & > div {
                    height: 400px;
                    width: 100%;
                  }
                `}
              >
                <LensEmbeddableComponent
                  data-test-subj="chart"
                  id="annotation-library-preview"
                  timeRange={chartTimeRange}
                  attributes={lensAttributes}
                  onBrushEnd={({ range }) =>
                    setChartTimeRange({
                      from: new Date(range[0]).toISOString(),
                      to: new Date(range[1]).toISOString(),
                    })
                  }
                  searchSessionId={searchSessionId}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup
            css={css`
              height: 100%;
            `}
            direction="column"
            justifyContent="center"
          >
            <EuiFlexItem>
              <EuiEmptyPrompt
                iconType="error"
                color="danger"
                data-test-subj="missingDataViewPrompt"
                title={
                  <h4>
                    <FormattedMessage
                      id="eventAnnotationListing.groupPreview.missingDataViewTitle"
                      defaultMessage="Select a valid data view"
                    />
                  </h4>
                }
                body={
                  <p>
                    <FormattedMessage
                      id="eventAnnotationListing.groupPreview.missingDataViewDescription"
                      defaultMessage="The previously selected data view no longer exists. Please select a valid data view in order to preview and use this annotation group."
                    />
                  </p>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </>
  );
};
