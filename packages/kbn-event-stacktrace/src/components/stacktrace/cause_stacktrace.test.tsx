/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { mountWithTheme } from '../../utils/test_helpers';
import { CauseStacktrace } from './cause_stacktrace';

describe('CauseStacktrace', () => {
  describe('render', () => {
    describe('with no stack trace', () => {
      it('renders without the accordion', () => {
        const props = { id: 'testId', message: 'testMessage' };

        expect(mountWithTheme(<CauseStacktrace {...props} />).find('CausedBy')).toHaveLength(1);
      });
    });

    describe('with no message and a stack trace', () => {
      it('says "Caused by …', () => {
        const props = {
          id: 'testId',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };

        expect(
          mountWithTheme(<CauseStacktrace {...props} />)
            .find('EuiTitle span')
            .text()
        ).toEqual('…');
      });
    });

    describe('with a message and a stack trace', () => {
      it('renders with the accordion', () => {
        const props = {
          id: 'testId',
          message: 'testMessage',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };

        expect(
          shallow(<CauseStacktrace {...props} />).find('Styled(EuiAccordionClass)')
        ).toHaveLength(1);
      });
    });
  });
});
