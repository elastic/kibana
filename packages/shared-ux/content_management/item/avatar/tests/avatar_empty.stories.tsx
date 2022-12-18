/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CmAvatarEmpty } from '../avatar_empty';

export default {
  title: 'Content Management/Item/Avatar/AvatarEmpty',
  description:
    'Renders any content item as an "avatar" - a small circle or a square with with text initials or an image.',
  parameters: {
  },
};

export const SizeScale = () => {
  return (
    <>
      <CmAvatarEmpty size={'s'} />
      <CmAvatarEmpty size={'m'} />
      <CmAvatarEmpty size={'l'} />
      <CmAvatarEmpty size={'xl'} />

      <br />

      <CmAvatarEmpty size={'s'} round />
      <CmAvatarEmpty size={'m'} round />
      <CmAvatarEmpty size={'l'} round />
      <CmAvatarEmpty size={'xl'} round />
    </>
  );
};

export const EnabledVsDisabled = () => {
  return (
    <>
      <CmAvatarEmpty />
      <CmAvatarEmpty disabled />
    </>
  );
};
