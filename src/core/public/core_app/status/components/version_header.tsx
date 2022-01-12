/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPageContent, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServerVersion } from '../../../../types/status';

interface VersionHeaderProps {
  version: ServerVersion;
}

export const VersionHeader: FC<VersionHeaderProps> = ({ version }) => {
  const { build_hash: buildHash, build_number: buildNumber, number } = version;
  return (
    <EuiPageContent grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p data-test-subj="statusBuildVersion">
              <FormattedMessage
                id="core.statusPage.statusApp.statusActions.versionText"
                defaultMessage="VERSION: {versionNum}"
                values={{
                  versionNum: <strong>{number}</strong>,
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p data-test-subj="statusBuildNumber">
              <FormattedMessage
                id="core.statusPage.statusApp.statusActions.buildText"
                defaultMessage="BUILD: {buildNum}"
                values={{
                  buildNum: <strong>{buildNumber}</strong>,
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p data-test-subj="statusBuildHash">
              <FormattedMessage
                id="core.statusPage.statusApp.statusActions.commitText"
                defaultMessage="COMMIT: {buildSha}"
                values={{
                  buildSha: <strong>{buildHash}</strong>,
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageContent>
  );
};
