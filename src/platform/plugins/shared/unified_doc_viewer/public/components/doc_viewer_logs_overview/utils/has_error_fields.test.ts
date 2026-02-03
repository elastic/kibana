/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasErrorFields } from './has_error_fields';
import { fieldConstants } from '@kbn/discover-utils';
import type { LogDocumentOverview } from '@kbn/discover-utils';

describe('hasErrorFields', () => {
  const createBaseDoc = (): LogDocumentOverview => ({
    [fieldConstants.TIMESTAMP_FIELD]: '2024-01-15T10:30:00Z',
    [fieldConstants.DATASTREAM_NAMESPACE_FIELD]: 'default',
    [fieldConstants.DATASTREAM_DATASET_FIELD]: 'logs',
  });

  describe('error.culprit', () => {
    describe('with error log level', () => {
      it('returns true when error.culprit is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns false when error.culprit is undefined', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when error.culprit is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_CULPRIT_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });
    });

    describe('without error log level', () => {
      describe('with error event type', () => {
        it('returns true when error.culprit is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
            [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
          } as any;

          expect(hasErrorFields(doc)).toBe(true);
        });
      });

      describe('without error event type', () => {
        it('returns false when error.culprit is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
          };

          expect(hasErrorFields(doc)).toBe(false);
        });
      });
    });
  });

  describe('message fields', () => {
    describe('with error log level', () => {
      it('returns true when error.message is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_MESSAGE_FIELD]: 'Error occurred',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when exception.message is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.EXCEPTION_MESSAGE_FIELD]: 'Exception occurred',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when error.exception.message is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_EXCEPTION_MESSAGE]: 'Error exception message',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when attributes.exception.message is present (OTel)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_MESSAGE]: 'OTel exception message',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when generic message field is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.MESSAGE_FIELD]: 'Payment failed',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when event.original is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.EVENT_ORIGINAL_FIELD]: 'Original event message',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns false when error.message is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_MESSAGE_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when exception.message is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.EXCEPTION_MESSAGE_FIELD]: '',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when error.exception.message is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_EXCEPTION_MESSAGE]: '',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when attributes.exception.message is empty string (OTel)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_MESSAGE]: '',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when generic message field is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.MESSAGE_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when event.original is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.EVENT_ORIGINAL_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });
    });

    describe('without error log level', () => {
      describe('with error event type', () => {
        it('returns true when error.message is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.OTEL_EVENT_NAME_FIELD]: 'exception',
            [fieldConstants.ERROR_MESSAGE_FIELD]: 'Error occurred',
          } as any;

          expect(hasErrorFields(doc)).toBe(true);
        });
      });

      describe('without error event type', () => {
        it('returns false when error.message is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.ERROR_MESSAGE_FIELD]: 'Error occurred',
          };

          expect(hasErrorFields(doc)).toBe(false);
        });
      });
    });
  });

  describe('exception.type fields', () => {
    describe('with error log level', () => {
      it('returns true when exception.type is present (OTel format)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when error.exception.type is present (APM format fallback)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_EXCEPTION_TYPE_FIELD]: 'ValueError',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when exception.type is an array', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: ['ProgrammingError', 'UndefinedTable'] as any,
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns false when exception.type is empty string (OTel format)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when error.exception.type is empty string (APM format)', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_EXCEPTION_TYPE_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when exception.type is undefined', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });
    });

    describe('without error log level', () => {
      describe('with error event type', () => {
        it('returns true when exception.type is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
            [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
          } as any;

          expect(hasErrorFields(doc)).toBe(true);
        });
      });

      describe('without error event type', () => {
        it('returns false when exception.type is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
          };

          expect(hasErrorFields(doc)).toBe(false);
        });
      });
    });
  });

  describe('error.grouping_name', () => {
    describe('with error log level', () => {
      it('returns true when error.grouping_name is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_GROUPING_NAME_FIELD]: 'error-group-123',
        };

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns false when error.grouping_name is empty string', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.LOG_LEVEL_FIELD]: 'error',
          [fieldConstants.ERROR_GROUPING_NAME_FIELD]: '',
        };

        expect(hasErrorFields(doc)).toBe(false);
      });
    });

    describe('without error log level', () => {
      describe('with error event type', () => {
        it('returns true when error.grouping_name is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.OTEL_EVENT_NAME_FIELD]: 'exception',
            [fieldConstants.ERROR_GROUPING_NAME_FIELD]: 'error-group-123',
          } as any;

          expect(hasErrorFields(doc)).toBe(true);
        });
      });

      describe('without error event type', () => {
        it('returns false when error.grouping_name is present', () => {
          const doc: LogDocumentOverview = {
            ...createBaseDoc(),
            [fieldConstants.LOG_LEVEL_FIELD]: 'info',
            [fieldConstants.ERROR_GROUPING_NAME_FIELD]: 'error-group-123',
          };

          expect(hasErrorFields(doc)).toBe(false);
        });
      });
    });
  });

  describe('event.type fields', () => {
    describe('with error event type', () => {
      it('returns true when processor.event is "error" and error.culprit is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
          [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when event_name is "exception" and error.message is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          event_name: 'exception',
          [fieldConstants.ERROR_MESSAGE_FIELD]: 'Error occurred',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when processor.event is "error" and exception.type is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
          [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns true when event_name includes "error" and error.grouping_name is present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.OTEL_EVENT_NAME_FIELD]: 'error_event',
          [fieldConstants.ERROR_GROUPING_NAME_FIELD]: 'error-group-123',
        } as any;

        expect(hasErrorFields(doc)).toBe(true);
      });

      it('returns false when processor.event is "error" but no error fields are present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when event_name is "exception" but no error fields are present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          event_name: 'exception',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });
    });

    describe('without error event type', () => {
      it('returns false when processor.event is "transaction" and error fields are present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.PROCESSOR_EVENT_FIELD]: 'transaction',
          [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });

      it('returns false when event_name is "span" and error fields are present', () => {
        const doc: LogDocumentOverview = {
          ...createBaseDoc(),
          [fieldConstants.OTEL_EVENT_NAME_FIELD]: 'span',
          [fieldConstants.ERROR_MESSAGE_FIELD]: 'Error occurred',
        } as any;

        expect(hasErrorFields(doc)).toBe(false);
      });
    });
  });

  describe('log.level fields', () => {
    it('returns true with fatal log level and error fields', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'fatal',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
      };

      expect(hasErrorFields(doc)).toBe(true);
    });

    it('returns true with critical log level and error fields', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'critical',
        [fieldConstants.ERROR_MESSAGE_FIELD]: 'Critical error',
      };

      expect(hasErrorFields(doc)).toBe(true);
    });

    it('returns true with severe log level and error fields', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'severe',
        [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'SevereError',
      };

      expect(hasErrorFields(doc)).toBe(true);
    });

    it('returns false when log level is not error and no error fields are present', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'info',
        [fieldConstants.MESSAGE_FIELD]: 'Info message',
      };

      expect(hasErrorFields(doc)).toBe(false);
    });

    it('returns false when log level is missing and error fields are present', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
      };

      expect(hasErrorFields(doc)).toBe(false);
    });

    it('returns true when log level is missing but event.type is error and error fields are present', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.PROCESSOR_EVENT_FIELD]: 'error',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
      } as any;

      expect(hasErrorFields(doc)).toBe(true);
    });
  });

  describe('combined fields', () => {
    it('returns true when multiple error fields are present with error log level', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'error',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
        [fieldConstants.ERROR_MESSAGE_FIELD]: 'Payment failed',
        [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: 'ProgrammingError',
      };

      expect(hasErrorFields(doc)).toBe(true);
    });

    it('returns true when error.grouping_name is present with other error fields', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.LOG_LEVEL_FIELD]: 'error',
        [fieldConstants.ERROR_GROUPING_NAME_FIELD]: 'error-group-123',
        [fieldConstants.ERROR_CULPRIT_FIELD]: 'charge',
      };

      expect(hasErrorFields(doc)).toBe(true);
    });
  });

  describe('negative cases', () => {
    it('returns false when no error fields are present', () => {
      const doc: LogDocumentOverview = {
        ...createBaseDoc(),
        [fieldConstants.SERVICE_NAME_FIELD]: 'payment-service',
        [fieldConstants.TIMESTAMP_FIELD]: '2024-01-15T10:30:00Z',
      };

      expect(hasErrorFields(doc)).toBe(false);
    });
  });
});
