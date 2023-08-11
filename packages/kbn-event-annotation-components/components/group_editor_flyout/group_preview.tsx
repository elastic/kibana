/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
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
import React, { useCallback, useMemo, useState } from 'react';
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
}: {
  group: EventAnnotationGroupConfig;
  dataViews: DataView[];
  LensEmbeddableComponent: LensEmbeddableComponent;
}) => {
  const [chartTimeRange, setChartTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  const customQuickSelectRender = useCallback<
    Required<EuiSuperDatePickerProps>['customQuickSelectRender']
  >(
    ({ quickSelect, commonlyUsedRanges, customQuickSelectPanels }) =>
      (
        <>
          {customQuickSelectPanels}
          {quickSelect}
          {commonlyUsedRanges}
        </>
      ) as React.ReactNode,
    []
  );

  const currentDataView = useMemo(
    () => dataViews.find((dataView) => dataView.id === group.indexPatternId) || dataViews[0],
    [dataViews, group.indexPatternId]
  );

  const timeFieldNames = useMemo(
    () => currentDataView.fields.getByType('date').map((field) => field.name),
    [currentDataView.fields]
  );

  // We can assume that there is at least one time field because we don't allow annotation groups to be created without one
  const defaultTimeFieldName = useMemo(
    () => currentDataView.timeFieldName ?? timeFieldNames[0],
    [currentDataView.timeFieldName, timeFieldNames]
  );

  const [currentTimeFieldName, setCurrentTimeFieldName] = useState<string>(defaultTimeFieldName);

  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes']>(
    getLensAttributes(group, currentTimeFieldName)
  );

  useDebounce(
    () => {
      setLensAttributes(getLensAttributes(group, currentTimeFieldName));
    },
    250,
    [group, currentTimeFieldName]
  );

  return (
    <>
      <EuiFlyoutHeader>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="eventAnnotationComponents.groupEditor.preview"
                  defaultMessage="Preview"
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              width: 310px;
            `}
            grow={false}
          >
            <EuiSuperDatePicker
              onTimeChange={({ start: from, end: to }) => {
                setChartTimeRange({ from, to });
              }}
              start={chartTimeRange.from}
              end={chartTimeRange.to}
              showUpdateButton={false}
              compressed
              customQuickSelectRender={customQuickSelectRender}
              customQuickSelectPanels={[
                {
                  title: i18n.translate('eventAnnotationComponents.timeField', {
                    defaultMessage: 'Time field',
                  }),
                  content: (
                    <EuiSelect
                      aria-label={i18n.translate('eventAnnotationComponents.timeField', {
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
      <EuiFlyoutBody>
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
          />
        </div>
      </EuiFlyoutBody>
    </>
  );
};
