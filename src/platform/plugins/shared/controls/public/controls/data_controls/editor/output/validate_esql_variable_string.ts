/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLControlVariable, ESQLVariableType, VariableNamePrefix } from '@kbn/esql-types';
import { EditorComponentStatus, getESQLVariableInvalidRegex } from '../editor_constants';
import { DataControlEditorStrings } from '../../data_control_constants';

const getVariableNamePrefix = (type: ESQLVariableType) => {
  switch (type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return VariableNamePrefix.IDENTIFIER;
    case ESQLVariableType.VALUES:
    case ESQLVariableType.TIME_LITERAL:
    default:
      return VariableNamePrefix.VALUE;
  }
};

const esqlVariableNameInUse = (
  esqlVariableString: string,
  existingESQLVariables: ESQLControlVariable[]
) => {
  const variableNameWithoutQuestionMarks = esqlVariableString.replace(/^\?+/, '');
  const variablePrefix = esqlVariableString.startsWith('??') ? '??' : '?';
  return existingESQLVariables.some((variable) => {
    const prefix = getVariableNamePrefix(variable.type);
    if (prefix === variablePrefix) {
      return variable.key === variableNameWithoutQuestionMarks;
    }
    return false;
  });
};

export const validateESQLVariableString = (
  esqlVariableString: string | undefined,
  initialVariableString: string | undefined,
  existingESQLVariables: ESQLControlVariable[],
  isStaticValuesSource: boolean
): [EditorComponentStatus, string | null] => {
  if (
    !esqlVariableString ||
    esqlVariableString === '?' ||
    esqlVariableString.length === 0 ||
    (isStaticValuesSource && esqlVariableString === '??')
  ) {
    return [EditorComponentStatus.INCOMPLETE, null];
  }

  const invalidPrefix = !isStaticValuesSource && esqlVariableString.startsWith('??');
  // Check for invalid characters after initial question mark(s)
  const invalidCharacters = getESQLVariableInvalidRegex().test(
    esqlVariableString.replace(/^\?+/, '')
  );
  const variableNameInUse =
    esqlVariableString !== initialVariableString &&
    esqlVariableNameInUse(esqlVariableString, existingESQLVariables);

  if (invalidPrefix || invalidCharacters || variableNameInUse) {
    const errorToReport = invalidPrefix
      ? DataControlEditorStrings.manageControl.esqlOutput.getInvalidPrefixError()
      : invalidCharacters
      ? DataControlEditorStrings.manageControl.esqlOutput.getInvalidCharactersError()
      : variableNameInUse
      ? DataControlEditorStrings.manageControl.esqlOutput.getVariableNameInUseError()
      : null;

    return [EditorComponentStatus.ERROR, errorToReport];
  } else {
    return [EditorComponentStatus.COMPLETE, null];
  }
};
