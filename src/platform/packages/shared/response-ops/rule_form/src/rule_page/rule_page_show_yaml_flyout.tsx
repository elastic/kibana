/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiCodeBlock,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { dump } from 'js-yaml';
import { useRuleFormState, useRuleFormScreenContext } from '../hooks';
import { transformCreateESQLRuleBody } from '../common/apis/create_rule';
import type { CreateRuleBody } from '../common/apis/create_rule';
export const RulePageShowYamlFlyout = () => {
  const { formData } = useRuleFormState();
  const { setIsShowYamlFlyoutVisible } = useRuleFormScreenContext();
  const modalTitleId = useGeneratedHtmlId();

  const apiPayload = transformCreateESQLRuleBody(formData as CreateRuleBody);
  const yamlConfig = dump(apiPayload);

  return (
    <EuiFlyout
      ownFocus
      aria-labelledby={modalTitleId}
      onClose={() => setIsShowYamlFlyoutVisible(false)}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={modalTitleId}>Rule Configuration as YAML</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock language="yaml" isCopyable>
          {yamlConfig}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
