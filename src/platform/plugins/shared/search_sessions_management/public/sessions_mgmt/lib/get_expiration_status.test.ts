/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { getExpirationStatus } from './get_expiration_status';

const CURRENT_MOCK_DATE = '2025-01-01T00:00:00.000Z';

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(CURRENT_MOCK_DATE));
});

const setup = ({
  expiresSoonWarning = moment.duration(7, 'days'),
  expires,
}: {
  expiresSoonWarning?: moment.Duration;
  expires: string;
}) => {
  return getExpirationStatus(
    {
      enabled: true,
      notTouchedTimeout: moment.duration(0),
      maxUpdateRetries: 0,
      defaultExpiration: moment.duration(0),
      management: {
        expiresSoonWarning,
        refreshInterval: moment.duration(0),
        refreshTimeout: moment.duration(0),
        maxSessions: 0,
      },
    },
    expires || CURRENT_MOCK_DATE
  );
};

describe('getExpirationStatus', () => {
  describe('when it expires in more than the configured expiresSoonWarning', () => {
    it('returns undefined', () => {
      const status = setup({
        expiresSoonWarning: moment.duration(7, 'days'),
        expires: moment.utc(CURRENT_MOCK_DATE).add(8, 'days').toISOString(),
      });
      expect(status).toBeUndefined();
    });
  });

  describe('when it expires in less than the configured expiresSoonWarning', () => {
    describe('when it expires in 1 day', () => {
      it('should return the correct stastus', () => {
        const status = setup({
          expiresSoonWarning: moment.duration(7, 'days'),
          expires: moment.utc(CURRENT_MOCK_DATE).add(1, 'day').toISOString(),
        });
        expect(status).toEqual({
          toolTipContent: 'Expires in 1 day',
          statusContent: '1 day',
        });
      });
    });

    describe('when it expires in 2 days', () => {
      it('should return the correct status', () => {
        const status = setup({
          expiresSoonWarning: moment.duration(7, 'days'),
          expires: moment.utc(CURRENT_MOCK_DATE).add(2, 'days').toISOString(),
        });
        expect(status).toEqual({
          toolTipContent: 'Expires in 2 days',
          statusContent: '2 days',
        });
      });
    });

    describe('when it expires in less than 1 day', () => {
      describe('when it expires in 1 hour', () => {
        it('should return the correct status', () => {
          const status = setup({
            expiresSoonWarning: moment.duration(7, 'days'),
            expires: moment.utc(CURRENT_MOCK_DATE).add(1, 'hour').toISOString(),
          });
          expect(status).toEqual({
            toolTipContent: 'This session expires in 1 hour',
            statusContent: '1 hour',
          });
        });
      });

      describe('when it expires in 2 hours', () => {
        it('should return the correct status', () => {
          const status = setup({
            expiresSoonWarning: moment.duration(7, 'days'),
            expires: moment.utc(CURRENT_MOCK_DATE).add(2, 'hours').toISOString(),
          });
          expect(status).toEqual({
            toolTipContent: 'This session expires in 2 hours',
            statusContent: '2 hours',
          });
        });
      });
    });
  });
});
