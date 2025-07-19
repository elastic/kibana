/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import type { RuleFormProps } from './rule_form';
import { RuleFormErrorPromptWrapper } from '../rule_form_errors';

const RuleFormLazy: React.LazyExoticComponent<React.FC<RuleFormProps<any>>> = React.lazy(() =>
  import('./rule_form').then((module) => ({ default: module.RuleForm }))
);

export const RuleForm = (props: RuleFormProps<any>) => (
  <Suspense
    fallback={
      <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
        <EuiLoadingElastic size="xl" />
      </RuleFormErrorPromptWrapper>
    }
  >
    <RuleFormLazy {...props} isFlyout />
  </Suspense>
);

export { type RuleFormProps };
