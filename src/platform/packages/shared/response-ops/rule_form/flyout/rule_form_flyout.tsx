/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout, EuiLoadingElastic } from '@elastic/eui';
import React, { Suspense, lazy, useCallback } from 'react';
import type { RuleFormProps } from '../src/rule_form';
import type { RuleTypeMetaData } from '../src/types';
import {
  RuleFlyoutUIContextProvider,
  useRuleFlyoutUIContext,
  RuleFormErrorPromptWrapper,
} from '../lib';

const RuleForm: React.LazyExoticComponent<React.FC<RuleFormProps<any>>> = lazy(() =>
  import('../src/rule_form').then((module) => ({ default: module.RuleForm }))
);

export const RuleFormFlyoutWithContext = <MetaData extends RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const { onClickClose, hideCloseButton } = useRuleFlyoutUIContext();
  const onClose = useCallback(() => {
    if (onClickClose) {
      onClickClose();
    } else {
      props.onCancel?.();
    }
  }, [onClickClose, props]);
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      size={620}
      className="ruleFormFlyout__container"
      hideCloseButton={hideCloseButton}
    >
      <Suspense
        fallback={
          <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
            <EuiLoadingElastic size="xl" />
          </RuleFormErrorPromptWrapper>
        }
      >
        <RuleForm {...props} isFlyout />
      </Suspense>
    </EuiFlyout>
  );
};

export const RuleFormFlyout = <MetaData extends RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  return (
    <RuleFlyoutUIContextProvider>
      <RuleFormFlyoutWithContext {...props} />
    </RuleFlyoutUIContextProvider>
  );
};
