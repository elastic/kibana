/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks, useKibana } from '@kbn/kibana-react-plugin/public';
import { FeatureCatalogueEntry, FeatureCatalogueCategory } from '@kbn/home-plugin/public';
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';
import { METRIC_TYPE, trackUiMetric } from '../../lib/ui_metric';

interface Props {
  addBasePath: (path: string) => string;
  features: FeatureCatalogueEntry[];
}

export const AddData: FC<Props> = ({ addBasePath, features }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  return (
    <section className="kbnOverviewDataAdd" aria-labelledby="kbnOverviewDataAdd__title">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiTitle size="s">
            <h2 id="kbnOverviewDataAdd__title">
              <FormattedMessage
                id="kibanaOverview.addData.sectionTitle"
                defaultMessage="Ingest your data"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem className="kbnOverviewDataAdd__actions" grow={false}>
          <div>
            <EuiButtonEmpty
              className="kbnOverviewDataAdd__actionButton"
              flush="both"
              href={addBasePath('#/tutorial_directory/sampleData')}
              iconType="visTable"
              size="xs"
            >
              <FormattedMessage
                id="kibanaOverview.addData.sampleDataButtonLabel"
                defaultMessage="Try our sample data"
              />
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup className="kbnOverviewDataAdd__content">
        {features.map((feature) => (
          <EuiFlexItem key={feature.id}>
            <RedirectAppLinks application={application}>
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
            </RedirectAppLinks>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </section>
  );
};

AddData.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  features: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      showOnHomePage: PropTypes.bool.isRequired,
      category: PropTypes.oneOf(Object.values(FeatureCatalogueCategory)).isRequired,
      order: PropTypes.number as PropTypes.Validator<number | undefined>,
    }).isRequired
  ).isRequired,
};
