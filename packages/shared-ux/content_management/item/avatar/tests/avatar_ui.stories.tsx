/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CmAvatarUi } from '../avatar_ui';

export default {
  title: 'Content Management/Item/Avatar/AvatarUi',
  description:
    'A presentational component of "avatar" view for a single content item.',
  parameters: {},
};

export const Default = () => <CmAvatarUi title="John Doe" />;
export const Round = () => <CmAvatarUi title="John Doe" round />;
export const FirstNameOnly = () => <CmAvatarUi title="Mike" />;
export const OneCharacterInTitle = () => <CmAvatarUi title="a" />;
export const NoTitle = () => <CmAvatarUi title="a" />;
