/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks, useKibana } from '@kbn/kibana-react-plugin/public';
<<<<<<< HEAD
import { FeatureCatalogueEntry } from '@kbn/home-plugin/public';
=======
import { FeatureCatalogueEntry, FeatureCatalogueCategory } from '@kbn/home-plugin/public';
>>>>>>> upstream/main
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';
import { METRIC_TYPE, trackUiMetric } from '../../lib/ui_metric';

interface Props {
  addBasePath: (path: string) => string;
  features: FeatureCatalogueEntry[];
}

export const ManageData: FC<Props> = ({ addBasePath, features }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
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

          <EuiFlexGroup className="kbnOverviewDataManage__content" wrap>
            {features.map((feature) => (
              <EuiFlexItem className="kbnOverviewDataManage__item" key={feature.id}>
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
      ) : null}
    </>
  );
};

ManageData.propTypes = {
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
