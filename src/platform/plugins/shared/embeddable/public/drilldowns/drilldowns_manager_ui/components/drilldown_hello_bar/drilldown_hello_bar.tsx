/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { core } from '../../../../kibana_services';
import { txtHideHelpButtonLabel, txtHelpText, txtViewDocsLinkLabel } from './i18n';

export const WELCOME_MESSAGE_TEST_SUBJ = 'drilldownsWelcomeMessage';

const localStorage = new Storage(window?.localStorage);
const helloMessageStorageKey = `drilldowns:hidWelcomeMessage`;
const docsLink = core.docLinks.links.dashboard.drilldowns

export const DrilldownHelloBar = () => {
  const [hide, setHide] = useState(localStorage.get(helloMessageStorageKey) ?? false);
  const onHideClick = useCallback(() => {
    localStorage.set(helloMessageStorageKey, true);
    setHide(true);
  },
  []);
  return hide ? null : (
    <EuiCallOut data-test-subj={WELCOME_MESSAGE_TEST_SUBJ}>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="question" />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiText size={'s'}>
            <EuiTextColor color="subdued">{txtHelpText}</EuiTextColor>
          </EuiText>
          {docsLink && (
            <>
              <EuiSpacer size={'xs'} />
              <EuiLink href={docsLink} target="_blank" external>
                {txtViewDocsLinkLabel}
              </EuiLink>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" onClick={onHideClick}>
            {txtHideHelpButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
