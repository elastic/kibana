/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiTabs,
  EuiTab,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { VISUALIZE_EDITOR_TRIGGER } from '../../../../../ui_actions/public';
import { PANEL_TYPES } from '../../../common/enums';
import type { Panel } from '../../../common/types';
import { TimeseriesVisParams } from '../../types';
import { getUiActions } from '../../services';
import { triggerVisualizeToLensActions } from './lib/trigger_action';

const tabs = [
  {
    type: PANEL_TYPES.TIMESERIES,
    label: i18n.translate('visTypeTimeseries.visPicker.timeSeriesLabel', {
      defaultMessage: 'Time Series',
    }),
  },
  {
    type: PANEL_TYPES.METRIC,
    label: i18n.translate('visTypeTimeseries.visPicker.metricLabel', {
      defaultMessage: 'Metric',
    }),
  },
  {
    type: PANEL_TYPES.TOP_N,
    label: i18n.translate('visTypeTimeseries.visPicker.topNLabel', {
      defaultMessage: 'Top N',
    }),
  },
  {
    type: PANEL_TYPES.GAUGE,
    label: i18n.translate('visTypeTimeseries.visPicker.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
  },
  { type: PANEL_TYPES.MARKDOWN, label: 'Markdown' },
  {
    type: PANEL_TYPES.TABLE,
    label: i18n.translate('visTypeTimeseries.visPicker.tableLabel', {
      defaultMessage: 'Table',
    }),
  },
];

interface VisPickerProps {
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
  currentVisType: TimeseriesVisParams['type'];
  model: Panel;
}

export const VisPicker = ({ onChange, currentVisType, model }: VisPickerProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const onConvert = useCallback(async () => {
    const triggerOptions = await triggerVisualizeToLensActions(model);
    if (triggerOptions) {
      getUiActions().getTrigger(VISUALIZE_EDITOR_TRIGGER).exec(triggerOptions);
    } else {
      showModal();
    }
  }, [model]);

  let modal;

  if (isModalVisible) {
    modal = (
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>
              {i18n.translate('visTypeTimeseries.visPicker.convertToLensModalTitle', {
                defaultMessage: 'Ooops',
              })}
            </h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {i18n.translate('visTypeTimeseries.visPicker.convertToLensModalBody', {
            defaultMessage: 'This feature is not supported yet it Lens, try another setup.',
          })}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton onClick={closeModal} fill>
            Close
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTabs size="l">
          {tabs.map(({ label, type }) => (
            <EuiTab
              key={type}
              isSelected={type === currentVisType}
              onClick={() => onChange({ type })}
              data-test-subj={`${type}TsvbTypeBtn`}
            >
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          color="accent"
          onClick={async () => await onConvert()}
          disabled={currentVisType !== PANEL_TYPES.TIMESERIES}
        >
          {i18n.translate('visTypeTimeseries.visPicker.convertToLensLabel', {
            defaultMessage: 'Try our new UI',
          })}
        </EuiButton>
        {modal}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
