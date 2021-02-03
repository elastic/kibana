/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiHorizontalRule, EuiSpacer, EuiTitle, EuiFlexItem } from '@elastic/eui';
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

export const ManageData: FC<Props> = ({ addBasePath, features }) => {
  const { trackUiMetric } = getServices();
  return (
    <>
      {features.length > 1 && <EuiHorizontalRule margin="xl" aria-hidden="true" />}

      {features.length > 0 && (
        <section
          className="homDataManage"
          aria-labelledby="homDataManage__title"
          data-test-subj="homDataManage"
        >
          <EuiTitle size="s">
            <h2 id="homDataManage__title">
              <FormattedMessage
                id="home.manageData.sectionTitle"
                defaultMessage="Manage your data"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiFlexGroup className="homDataManage__content">
            {features.map((feature) => (
              <EuiFlexItem key={feature.id}>
                <Synopsis
                  id={feature.id}
                  onClick={(event: MouseEvent) => {
                    trackUiMetric(METRIC_TYPE.CLICK, `manage_data_card_${feature.id}`);
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
      )}
    </>
  );
};

ManageData.propTypes = {
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
