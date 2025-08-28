/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ESQLColumn,
  ESQLCommand,
  ESQLFunction,
  ESQLIdentifier,
  ESQLLocation,
  ESQLMessage,
  ESQLSource,
} from '../../types';
import type {
  ErrorTypes,
  ErrorValues,
  FunctionDefinition,
  Signature,
  SupportedDataType,
} from '../types';

function getMessageAndTypeFromId<K extends ErrorTypes>({
  messageId,
  values,
}: {
  messageId: K;
  values: ErrorValues<K>;
}): { message: string; type?: 'error' | 'warning' } {
  // Use a less strict type instead of doing a typecast on each message type
  const out = values as unknown as Record<string, string>;
  // i18n validation wants to the values prop to be declared inline, so need to unpack and redeclare again all props
  switch (messageId) {
    case 'unknownColumn':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknownColumn', {
          defaultMessage: 'Unknown column "{name}"',
          values: { name: out.name },
        }),
      };
    case 'unknownIndex':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknownIndex', {
          defaultMessage: 'Unknown index "{name}"',
          values: { name: out.name },
        }),
      };
    case 'unknownFunction':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.missingFunction', {
          defaultMessage: 'Unknown function {name}',
          values: { name: out.name.toUpperCase() },
        }),
      };
    case 'noMatchingCallSignature':
      const signatureList = (out.validSignatures as unknown as string[])
        .map((sig) => `- (${sig})`)
        .join('\n  ');
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.noMatchingCallSignatures', {
          defaultMessage: `Invalid input types for {functionName}.

Received ({argTypes}).

Expected one of:
  {validSignatures}`,
          values: {
            functionName: out.functionName.toUpperCase(),
            argTypes: out.argTypes,
            validSignatures: signatureList,
          },
        }),
      };
    case 'wrongNumberArgsVariadic':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.wrongNumberArgsVariadic', {
          defaultMessage: '{fn} expected {validArgCounts} arguments, but got {actual}.',
          values: {
            fn: out.fn.toUpperCase(),
            validArgCounts: i18n.formatList(
              'disjunction',
              Array.from(out.validArgCounts).map(String)
            ),
            actual: out.actual,
          },
        }),
      };
    case 'wrongNumberArgsExact':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.wrongNumberArgsExact', {
          defaultMessage:
            '{fn} expected {expected, plural, one {one argument} other {{expected} arguments}}, but got {actual}.',
          values: {
            fn: out.fn.toUpperCase(),
            expected: out.expected,
            actual: out.actual,
          },
        }),
      };
    case 'wrongNumberArgsAtLeast':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.wrongNumberArgsAtLeast', {
          defaultMessage:
            '{fn} expected at least {minArgs, plural, one {one argument} other {{minArgs} arguments}}, but got {actual}.',
          values: {
            fn: out.fn.toUpperCase(),
            minArgs: out.minArgs,
            actual: out.actual,
          },
        }),
      };
    case 'unsupportedColumnTypeForCommand':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unsupportedColumnTypeForCommand', {
          defaultMessage:
            '{command} only supports values of type {type}. Found "{column}" of type {givenType}',
          values: {
            command: out.command.toUpperCase(),
            type: out.type,
            column: out.column,
            givenType: out.givenType,
          },
        }),
      };
    case 'unknownDissectKeyword':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknownDissectKeyword', {
          defaultMessage: 'Expected [APPEND_SEPARATOR] in [DISSECT] but found [{keyword}]',
          values: {
            keyword: out.keyword,
          },
        }),
      };
    case 'functionNotAllowedHere':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.functionNotAvailableInLocation', {
          defaultMessage: 'Function {name} not allowed in {locationName}',
          values: {
            locationName: out.locationName.toUpperCase(),
            name: out.name.toUpperCase(),
          },
        }),
      };
    case 'unknownInterval':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknownInterval', {
          defaultMessage: `Unexpected time interval qualifier: ''{value}''`,
          values: {
            value: out.value,
          },
        }),
      };
    case 'unknownPolicy':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknownPolicy', {
          defaultMessage: 'Unknown policy "{name}"',
          values: {
            name: out.name,
          },
        }),
      };
    case 'nestedAggFunction':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.nestedAggFunction', {
          defaultMessage: 'Aggregation functions cannot be nested. Found {name} in {parentName}.',
          values: {
            parentName: out.parentName.toUpperCase(),
            name: out.name.toUpperCase(),
          },
        }),
      };
    case 'unknownAggregateFunction':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unknowAggregateFunction', {
          defaultMessage:
            'Expected an aggregate function or group but got "{value}" of type {type}',
          values: {
            type: out.type,
            value: out.value,
          },
        }),
      };
    case 'unsupportedFieldType':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unsupportedFieldType', {
          defaultMessage:
            'Field "{field}" cannot be retrieved, it is unsupported or not indexed; returning null',
          values: {
            field: out.field,
          },
        }),
        type: 'warning',
      };
    case 'unsupportedMode':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.unsupportedSettingValue', {
          defaultMessage:
            'Unrecognized value "{value}" for {command}, mode needs to be one of [{expected}]',
          values: {
            expected: out.expected,
            value: out.value,
            command: out.command.toUpperCase(),
          },
        }),
        type: 'error',
      };
    case 'metadataBracketsDeprecation':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.metadataBracketsDeprecation', {
          defaultMessage: "Square brackets '[]' need to be removed from FROM METADATA declaration",
        }),
        type: 'warning',
      };
    case 'unknownMetadataField':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.wrongMetadataArgumentType', {
          defaultMessage:
            'Metadata field "{value}" is not available. Available metadata fields are: [{availableFields}]',
          values: {
            value: out.value,
            availableFields: out.availableFields,
          },
        }),
        type: 'error',
      };
    case 'wrongDissectOptionArgumentType':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.wrongDissectOptionArgumentType', {
          defaultMessage:
            'Invalid value for DISSECT APPEND_SEPARATOR: expected a string, but was [{value}]',
          values: {
            value: out.value,
          },
        }),
        type: 'error',
      };
    case 'invalidJoinIndex':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.invalidJoinIndex', {
          defaultMessage:
            '"{identifier}" is not a valid JOIN index. Please use a "lookup" mode index.',
          values: { identifier: out.identifier },
        }),
      };
    case 'tooManyForks':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.tooManyForks', {
          defaultMessage: '[FORK] a query cannot have more than one FORK command.',
        }),
      };
    case 'licenseRequired':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.licenseRequired', {
          defaultMessage: '{name} requires a {requiredLicense} license.',
          values: {
            name: out.name.toUpperCase(),
            requiredLicense: out.requiredLicense.toUpperCase(),
          },
        }),
      };
    case 'licenseRequiredForSignature':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.licenseRequiredForSignature', {
          defaultMessage:
            '{name} with {signatureDescription} requires a {requiredLicense} license.',
          values: {
            name: out.name.toUpperCase(),
            signatureDescription: out.signatureDescription,
            requiredLicense: out.requiredLicense.toUpperCase(),
          },
        }),
      };
    case 'changePointWrongFieldType':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.changePointWrongFieldType', {
          defaultMessage:
            'CHANGE_POINT only supports numeric values, found "{columnName}" of type {givenType}',
          values: {
            columnName: out.columnName,
            givenType: out.givenType,
          },
        }),
        type: 'error',
      };
    case 'dropTimestampWarning':
      return {
        message: i18n.translate('kbn-esql-ast.esql.validation.dropTimestampWarning', {
          defaultMessage: 'Dropping "@timestamp" prevents the time range from being applied.',
        }),
        type: 'warning',
      };
  }
  return { message: '' };
}

export function getMessageFromId<K extends ErrorTypes>({
  locations,
  ...payload
}: {
  messageId: K;
  values: ErrorValues<K>;
  locations: ESQLLocation;
}): ESQLMessage {
  const { message, type = 'error' } = getMessageAndTypeFromId(payload);
  return createMessage(type, message, locations, payload.messageId);
}

export function createMessage(
  type: 'error' | 'warning',
  message: string,
  location: ESQLLocation,
  messageId: string
): ESQLMessage {
  return {
    type,
    text: message,
    location,
    code: messageId,
  };
}

const createError = (messageId: string, location: ESQLLocation, message: string = '') =>
  createMessage('error', message, location, messageId);

export const errors = {
  unexpected: (
    location: ESQLLocation,
    message: string = i18n.translate('kbn-esql-ast.esql.validation.errors.unexpected.message', {
      defaultMessage: 'Unexpected error, this should never happen.',
    })
  ): ESQLMessage => {
    return createError('unexpected', location, message);
  },

  byId: <K extends ErrorTypes>(
    id: K,
    location: ESQLLocation,
    values: ErrorValues<K>
  ): ESQLMessage =>
    getMessageFromId({
      messageId: id,
      values,
      locations: location,
    }),

  unknownFunction: (fn: ESQLFunction): ESQLMessage =>
    errors.byId('unknownFunction', fn.location, fn),

  unknownColumn: (column: ESQLColumn | ESQLIdentifier): ESQLMessage =>
    errors.byId('unknownColumn', column.location, {
      name: column.name,
    }),

  tooManyForks: (command: ESQLCommand): ESQLMessage =>
    errors.byId('tooManyForks', command.location, {}),

  nestedAggFunction: (fn: ESQLFunction, parentName: string): ESQLMessage =>
    errors.byId('nestedAggFunction', fn.location, {
      name: fn.name,
      parentName,
    }),

  unknownAggFunction: (
    node: ESQLColumn | ESQLIdentifier,
    type: string = 'FieldAttribute'
  ): ESQLMessage =>
    errors.byId('unknownAggregateFunction', node.location, {
      value: node.name,
      type,
    }),

  invalidJoinIndex: (identifier: ESQLSource): ESQLMessage =>
    errors.byId('invalidJoinIndex', identifier.location, {
      identifier: identifier.name,
    }),

  noMatchingCallSignature: (
    fn: ESQLFunction,
    definition: FunctionDefinition,
    argTypes: string[]
  ): ESQLMessage => {
    const validSignatures = definition.signatures
      .toSorted((a, b) => a.params.length - b.params.length)
      .map((sig) => {
        const definitionArgTypes = buildSignatureTypes(sig);
        return `${definitionArgTypes}`;
      });

    return errors.byId('noMatchingCallSignature', fn.location, {
      functionName: fn.name,
      argTypes: argTypes.join(', '),
      validSignatures,
    });
  },

  licenseRequired: (fn: ESQLFunction, license: string): ESQLMessage =>
    errors.byId('licenseRequired', fn.location, {
      name: fn.name,
      requiredLicense: license,
    }),

  licenseRequiredForSignature: (fn: ESQLFunction, signature: Signature): ESQLMessage => {
    const signatureDescription = signature.params
      .map((param) => `'${param.name}' of type '${param.type}'`) // TODO this isn't well i18n'd
      .join(', ');

    return errors.byId('licenseRequiredForSignature', fn.location, {
      name: fn.name,
      signatureDescription,
      requiredLicense: signature.license!,
    });
  },

  functionNotAllowedHere: (fn: ESQLFunction, locationName: string): ESQLMessage =>
    errors.byId('functionNotAllowedHere', fn.location, {
      name: fn.name,
      locationName,
    }),

  wrongNumberArgs: (fn: ESQLFunction, definition: FunctionDefinition): ESQLMessage => {
    const validArgCounts = new Set<number>();
    let minParams: number | undefined;
    for (const sig of definition.signatures) {
      if (sig.minParams) {
        minParams = sig.minParams;
        break;
      }

      validArgCounts.add(sig.params.length);
      validArgCounts.add(sig.params.filter((p) => !p.optional).length);
    }

    const arity = fn.args.length;
    if (minParams !== undefined) {
      return errors.byId('wrongNumberArgsAtLeast', fn.location, {
        fn: fn.name,
        minArgs: minParams,
        actual: arity,
      });
    } else if (validArgCounts.size === 1) {
      const expected = Array.from(validArgCounts)[0];
      return errors.byId('wrongNumberArgsExact', fn.location, {
        fn: fn.name,
        expected,
        actual: fn.args.length,
      });
    } else {
      return errors.byId('wrongNumberArgsVariadic', fn.location, {
        fn: fn.name,
        validArgCounts: Array.from(validArgCounts),
        actual: arity,
      });
    }
  },

  changePointWrongFieldType: (
    { location, name }: ESQLColumn,
    type: SupportedDataType | 'unknown'
  ): ESQLMessage =>
    errors.byId('changePointWrongFieldType', location, {
      columnName: name,
      givenType: type,
    }),

  dropTimestampWarning: ({ location }: ESQLColumn): ESQLMessage =>
    errors.byId('dropTimestampWarning', location, {}),
};

export const buildSignatureTypes = (sig: Signature) =>
  sig.params
    .map((param) => {
      let ret = param.type as string;
      if (sig.minParams) {
        ret = '...' + ret;
      }
      if (param.optional) {
        ret = `[${ret}]`;
      }
      return ret;
    })
    .join(', ');
