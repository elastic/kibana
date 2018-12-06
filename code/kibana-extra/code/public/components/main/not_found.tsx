/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { fontSizes } from '../../style/variables';

const Container = styled.div`
  margin: auto;
  fontsize: ${fontSizes.xlarge};
`;
export const NotFound = () => <Container>404, Not Found</Container>;
