/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiToken } from '@elastic/eui';

export const IconRegular = () => <EuiIcon type="warning" aria-hidden={true} />;

export const IconLarge = () => <EuiIcon type="warning" size="xl" aria-hidden={true} />;

export const IconXXL = () => <EuiIcon type="warning" size="xxl" aria-hidden={true} />;

export const IconApp = () => <EuiIcon type="dashboardApp" size="xl" aria-hidden={true} />;

export const IconLogo = () => <EuiIcon type="logoElasticsearch" size="xl" aria-hidden={true} />;

export const TokenRegular = () => <EuiToken iconType="tokenString" aria-hidden={true} />;

export const TokenLarge = () => <EuiToken iconType="tokenFunction" size="m" aria-hidden={true} />;
