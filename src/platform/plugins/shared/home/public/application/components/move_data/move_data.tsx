/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
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

interface Props {
  addBasePath: (path: string) => string;
}

export const MoveData: FC<Props> = ({ addBasePath }) => {
  const migrateDataUrl = 'https://ela.st/cloud-migration';
  const buttonLabel = (
    <FormattedMessage
      id="home.addData.moveYourDataButtonLabel"
      defaultMessage="Move to Elastic Cloud"
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
                defaultMessage="Try managed Elastic"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="home.addData.moveYourDataToElasticCloud"
              defaultMessage="Deploy, scale, and upgrade your stack faster with Elastic Cloud. We’ll help you quickly move your data."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            data-test-subj="migrate_data_to_cloud__migrate_data_docs_link"
            color="primary"
            href={migrateDataUrl}
            target="_blank"
          >
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
