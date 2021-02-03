/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { EuiIconTip, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { DiscoverFieldBucket } from './discover_field_bucket';
import { getWarnings } from './lib/get_warnings';
import {
  triggerVisualizeActions,
  isFieldVisualizable,
  getVisualizeHref,
} from './lib/visualize_trigger_utils';
import { Bucket, FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import './discover_field_details.scss';
import { DiscoverFieldDetailsFooter } from './discover_field_details_footer';

interface DiscoverFieldDetailsProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  details: FieldDetails;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  showFooter?: boolean;
}

export function DiscoverFieldDetails({
  field,
  indexPattern,
  details,
  onAddFilter,
  trackUiMetric,
  showFooter = true,
}: DiscoverFieldDetailsProps) {
  const warnings = getWarnings(field);
  const [showVisualizeLink, setShowVisualizeLink] = useState<boolean>(false);
  const [visualizeLink, setVisualizeLink] = useState<string>('');

  useEffect(() => {
    isFieldVisualizable(field, indexPattern.id, details.columns).then(
      (flag) => {
        setShowVisualizeLink(flag);
        // get href only if Visualize button is enabled
        getVisualizeHref(field, indexPattern.id, details.columns).then(
          (uri) => {
            if (uri) setVisualizeLink(uri);
          },
          () => {
            setVisualizeLink('');
          }
        );
      },
      () => {
        setShowVisualizeLink(false);
      }
    );
  }, [field, indexPattern.id, details.columns]);

  const handleVisualizeLinkClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    // regular link click. let the uiActions code handle the navigation and show popup if needed
    event.preventDefault();
    if (trackUiMetric) {
      trackUiMetric(METRIC_TYPE.CLICK, 'visualize_link_click');
    }
    triggerVisualizeActions(field, indexPattern.id, details.columns);
  };

  return (
    <>
      <div className="dscFieldDetails">
        {details.error && <EuiText size="xs">{details.error}</EuiText>}
        {!details.error && (
          <div style={{ marginTop: '4px' }}>
            {details.buckets.map((bucket: Bucket, idx: number) => (
              <DiscoverFieldBucket
                key={`bucket${idx}`}
                bucket={bucket}
                field={field}
                onAddFilter={onAddFilter}
              />
            ))}
          </div>
        )}

        {showVisualizeLink && (
          <>
            <EuiSpacer size="xs" />
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButton
              onClick={(e) => handleVisualizeLinkClick(e)}
              href={visualizeLink}
              size="s"
              className="dscFieldDetails__visualizeBtn"
              data-test-subj={`fieldVisualize-${field.name}`}
            >
              <FormattedMessage
                id="discover.fieldChooser.detailViews.visualizeLinkText"
                defaultMessage="Visualize"
              />
            </EuiButton>
            {warnings.length > 0 && (
              <EuiIconTip type="alert" color="warning" content={warnings.join(' ')} />
            )}
          </>
        )}
      </div>
      {!details.error && showFooter && (
        <DiscoverFieldDetailsFooter
          field={field}
          indexPattern={indexPattern}
          details={details}
          onAddFilter={onAddFilter}
        />
      )}
    </>
  );
}
