/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FeatureCatalogueEntry } from '@kbn/home-plugin/public';
import { Synopsis } from '../synopsis';
import { METRIC_TYPE, trackUiMetric } from '../../lib/ui_metric';

interface Props {
  addBasePath: (path: string) => string;
  features: FeatureCatalogueEntry[];
}

export const ManageData: FC<Props> = ({ addBasePath, features }) => {
  const minBreakpointM = useEuiMinBreakpoint('m');
  return (
    <>
      {features.length > 1 ? <EuiHorizontalRule margin="xl" aria-hidden="true" /> : null}
      {features.length > 0 ? (
        <section
          className="kbnOverviewDataManage"
          aria-labelledby="kbnOverviewDataManage__title"
          data-test-subj="kbnOverviewDataManage"
        >
          <EuiTitle size="s">
            <h2 id="kbnOverviewDataManage__title">
              <FormattedMessage
                id="kibanaOverview.manageData.sectionTitle"
                defaultMessage="Manage your data"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiFlexGroup wrap>
            {features.map((feature) => (
              <EuiFlexItem
                key={feature.id}
                css={({ euiTheme }: UseEuiTheme) =>
                  css({
                    ':not(:only-child)': {
                      [minBreakpointM]: {
                        flex: `0 0 calc(50% - ${euiTheme.size.l})`,
                      },
                    },
                  })
                }
              >
                <Synopsis
                  id={feature.id}
                  description={feature.description}
                  iconType={feature.icon}
                  title={feature.title}
                  url={addBasePath(feature.path)}
                  wrapInPanel
                  onClick={() => {
                    trackUiMetric(METRIC_TYPE.CLICK, `ingest_data_card_${feature.id}`);
                  }}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </section>
      ) : null}
    </>
  );
};

ManageData.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
  features: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      showOnHomePage: PropTypes.bool.isRequired,
      category: PropTypes.string.isRequired,
      order: PropTypes.number as PropTypes.Validator<number | undefined>,
    }).isRequired
  ).isRequired,
};
