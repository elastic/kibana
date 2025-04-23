/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutResizable, EuiLoadingElastic } from '@elastic/eui';
import React, { Suspense, lazy, useCallback } from 'react';
import { css } from '@emotion/react';
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

const RuleFormFlyoutRenderer = <MetaData extends RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const { onClickClose, hideCloseButton } = useRuleFlyoutUIContext();

  const inLineContainerCss = css`
    container-type: inline-size;
  `;

  const onClose = useCallback(() => {
    // If onClickClose has been initialized, call it instead of onCancel. onClickClose should be used to
    // determine if the close confirmation modal should be shown. props.onCancel is passed down the component hierarchy
    // and will be called 1) by onClickClose, if the confirmation modal doesn't need to be shown, or 2) by the confirm
    // button on the confirmation modal
    if (onClickClose) {
      onClickClose();
    } else {
      // ONLY call props.onCancel directly from this level of the component hierarcht if onClickClose has not yet been initialized.
      // This will only occur if the user tries to close the flyout while the Suspense fallback is still visible
      props.onCancel?.();
    }
  }, [onClickClose, props]);
  return (
    <EuiFlyoutResizable
      ownFocus
      css={inLineContainerCss}
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      size={620}
      minWidth={500}
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
    </EuiFlyoutResizable>
  );
};

export const RuleFormFlyout = <MetaData extends RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  return (
    <RuleFlyoutUIContextProvider>
      <RuleFormFlyoutRenderer {...props} />
    </RuleFlyoutUIContextProvider>
  );
};
