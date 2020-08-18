/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
// @ts-expect-error untyped service
import { FeatureCatalogueEntry } from '../../services';
import { createAppNavigationHandler } from '../app_navigation_handler';
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';

interface Props {
  addBasePath: (path: string) => string;
  features: FeatureCatalogueEntry[];
}

export const AddData: FC<Props> = ({ addBasePath, features }) => (
  <section className="homDataAdd" aria-labelledby="homDataAdd__title">
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={1}>
        <EuiTitle size="s">
          <h2 id="homDataAdd__title">
            <FormattedMessage id="home.addData.sectionTitle" defaultMessage="Ingest your data" />
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="visTable"
          href="#/tutorial_directory/sampleData"
          size="xs"
          flush="right"
        >
          <FormattedMessage
            id="home.addData.sampleDataButtonLabel"
            defaultMessage="Try our sample data"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="m" />

    <EuiFlexGroup className="homDataAdd__content">
      {features.map((feature) => (
        <EuiFlexItem key={feature.id}>
          <Synopsis
            id={feature.id}
            onClick={createAppNavigationHandler(feature.path)}
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
