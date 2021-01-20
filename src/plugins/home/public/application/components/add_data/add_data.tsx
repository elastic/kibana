/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE } from '@kbn/analytics';
// @ts-expect-error untyped service
import { FeatureCatalogueEntry } from '../../services';
import { createAppNavigationHandler } from '../app_navigation_handler';
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  features: FeatureCatalogueEntry[];
}

export const AddData: FC<Props> = ({ addBasePath, features }) => {
  const { trackUiMetric } = getServices();

  return (
    <section className="homDataAdd" aria-labelledby="homDataAdd__title">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiTitle size="s">
            <h2 id="homDataAdd__title">
              <FormattedMessage id="home.addData.sectionTitle" defaultMessage="Ingest your data" />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem className="homDataAdd__actions" grow={false}>
          <div>
            <EuiButtonEmpty
              className="homDataAdd__actionButton"
              flush="left"
              href="#/tutorial_directory/sampleData"
              iconType="visTable"
              size="xs"
            >
              <FormattedMessage
                id="home.addData.sampleDataButtonLabel"
                defaultMessage="Try our sample data"
              />
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup className="homDataAdd__content">
        {features.map((feature) => (
          <EuiFlexItem key={feature.id}>
            <Synopsis
              id={feature.id}
              onClick={(event: MouseEvent) => {
                trackUiMetric(METRIC_TYPE.CLICK, `ingest_data_card_${feature.id}`);
                createAppNavigationHandler(feature.path)(event);
              }}
              description={feature.description}
              iconType={feature.icon}
              title={feature.title}
              url={addBasePath(feature.path)}
              wrapInPanel
            />
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
      category: PropTypes.string.isRequired,
      order: PropTypes.number,
    })
  ),
};
