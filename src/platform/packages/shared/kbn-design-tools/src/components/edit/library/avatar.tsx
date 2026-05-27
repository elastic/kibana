/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';

export const AvatarRegular = () => <EuiAvatar name="Jane Doe" size="m" />;

export const AvatarLarge = () => <EuiAvatar name="Jane Doe" size="xl" />;

export const AvatarSmall = () => <EuiAvatar name="Jane Doe" size="s" />;

export const AvatarSpace = () => <EuiAvatar name="Kibana" type="space" size="m" />;

export const AvatarIcon = () => <EuiAvatar name="Users" iconType="user" size="m" />;

export const AvatarDisabled = () => <EuiAvatar name="Disabled" size="m" isDisabled />;
