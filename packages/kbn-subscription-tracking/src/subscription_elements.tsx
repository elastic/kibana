/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { EuiLinkProps, EuiButtonEmptyProps, EuiButtonProps } from '@elastic/eui';
import { useGoToSubscription } from './use_go_to_subscription';
import { useImpression } from './use_impression';
import type { SubscriptionContextData } from '../types';

interface CommonProps {
  /** The context information for this subscription element */
  subscriptionContext: SubscriptionContextData;
}

export type SubscriptionLinkProps = EuiLinkProps & CommonProps;

/**
 * Wrapper around `EuiLink` that provides subscription events
 */
export function SubscriptionLink({
  subscriptionContext,
  children,
  ...restProps
}: SubscriptionLinkProps) {
  const goToSubscription = useGoToSubscription({ subscriptionContext });
  useImpression(subscriptionContext);

  return (
    <EuiLink {...restProps} onClick={goToSubscription}>
      {children}
    </EuiLink>
  );
}

export type SubscriptionButtonProps = EuiButtonProps & CommonProps;

/**
 * Wrapper around `EuiButton` that provides subscription events
 */
export function SubscriptionButton({
  subscriptionContext,
  children,
  ...restProps
}: SubscriptionButtonProps) {
  const goToSubscription = useGoToSubscription({ subscriptionContext });
  useImpression(subscriptionContext);

  return (
    <EuiButton {...restProps} onClick={goToSubscription}>
      {children}
    </EuiButton>
  );
}

export type SubscriptionButtonEmptyProps = EuiButtonEmptyProps & CommonProps;

/**
 * Wrapper around `EuiButtonEmpty` that provides subscription events
 */
export function SubscriptionButtonEmpty({
  subscriptionContext,
  children,
  ...restProps
}: SubscriptionButtonEmptyProps) {
  const goToSubscription = useGoToSubscription({ subscriptionContext });
  useImpression(subscriptionContext);

  return (
    <EuiButtonEmpty {...restProps} onClick={goToSubscription}>
      {children}
    </EuiButtonEmpty>
  );
}
