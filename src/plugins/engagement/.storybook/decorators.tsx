/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DecoratorFn } from '@storybook/react';
import { servicesDecorator as sharedUXServicesDecorator } from '../../shared_ux/.storybook/decorators';
import { ServicesProvider } from '../public/services';

const config = {
  chat: {
    enabled: true,
    chatURL: 'https://elasticcloud-production-chat-us-east-1.s3.amazonaws.com/drift-iframe.html',
    pocID: '53877975',
    pocEmail: 'sergei.poluektov+drift-chat@elasticsearch.com',
    pocJWT:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1Mzg3Nzk3NSIsImV4cCI6MTY0MjUxNDc0Mn0.CcAZbD8R865UmoHGi27wKn0aH1bzkZXhX449yyDH2Vk',
  },
};

export const servicesDecorator: DecoratorFn = (storyFn, context) => (
  <ServicesProvider {...config}>{sharedUXServicesDecorator(storyFn, context)}</ServicesProvider>
);
