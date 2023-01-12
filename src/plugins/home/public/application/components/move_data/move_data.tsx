/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  addBasePath: (path: string) => string;
}

export const MoveData: FC<Props> = ({ addBasePath }) => {
  const migrateDataUrl = '/app/management/data/migrate_data';
  const buttonLabel = (
    <FormattedMessage
      id="home.addData.moveYourDataButtonLabel"
      defaultMessage="Explore the benefits"
    />
  );

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiImage
            alt={i18n.translate('home.moveData.illustration.alt.text', {
              defaultMessage: 'Illustration for cloud data migration',
            })}
            src={addBasePath('/plugins/kibanaReact/assets/') + 'illustration_cloud_migration.png'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="home.addData.moveYourDataTitle"
                defaultMessage="Considering Elastic Cloud?"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="home.addData.moveYourDataToElasticCloud"
              defaultMessage="Moving your data to Elastic Cloud is easy and can save you time and money."
            />
          </EuiText>
          <EuiSpacer size="m" />
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiButton
            data-test-subj="migrate_data_to_cloud__migrate_data_docs_link"
            color="primary"
            href={addBasePath(migrateDataUrl)}
            onClick={(event: MouseEvent) => {
              createAppNavigationHandler(migrateDataUrl)(event);
            }}
          >
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
