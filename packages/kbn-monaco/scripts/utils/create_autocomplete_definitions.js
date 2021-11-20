/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const reservedWords = ['valueOf', 'toString'];

// Making an assumption that a method will not have >5 parameters
const parameterIndexToLetterMap = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
};

/**
 * The suggestion name is sometimes prefixed by the Java package
 * and needs to be removed for autocompletion.
 *
 * Some suggestions may also contain a "$" character, which indicates it is
 * an inner class in Java. For Painless, the "$" needs to be converted to "."
 * @param {string} name
 * @returns {string}
 */
const getDisplayName = (name, imported) => {
  let displayName = name;

  // If imported === true, we assume it is a Java class and need the short name
  if (imported) {
    displayName = name.split('.').pop() || name;
  }

  return displayName.replace('$', '.');
};

/**
 * Given the method name, array of parameters, and return value,
 * we create a description of the method that will be
 * used to display the help tooltip for the autocomplete suggestion
 *
 * Example of final format: pow(double a, double b): double
 *
 * Some methods support different parameter types and return values, so this is also supported
 * and represented by the "|" character
 *
 * Example: Long.parseLong(String a, int b | String a): long
 *
 * @param {string} methodName
 * @param {Array<Array<String>>} parameters
 * @param {string} returnValue
 * @returns {string}
 */
const getMethodDescription = (methodName, parameters, returnValues) => {
  const parametersDescription = parameters.reduce((paramsDescription, paramsArray, index) => {
    const isNotLastParameterSet = parameters.length - 1 !== index;

    const parameterSetDescription = paramsArray.reduce(
      (description, parameterType, paramsArrayIndex) => {
        const newParameterDescription = `${parameterType} ${parameterIndexToLetterMap[paramsArrayIndex]}`;
        const isLastParameter = paramsArray.length - 1 === paramsArrayIndex;

        description = `${description}${newParameterDescription}${isLastParameter ? '' : ', '}`;

        return isNotLastParameterSet && isLastParameter ? `${description} | ` : description;
      },
      ''
    );

    paramsDescription = `${paramsDescription}${parameterSetDescription}`;

    return paramsDescription;
  }, '');

  const uniqueReturnValues = [...new Set(returnValues)].join(' | ');

  return `${methodName}(${parametersDescription}): ${uniqueReturnValues}`;
};

/**
 * If a method supports multiple types of parameters, it is listed
 * twice in the dataset. This method filters out the duplicates and
 * adds all possible parameters to a method
 *
 * @param {Array} methods
 * @returns {Array}
 */
const removeDuplicateMethods = (methods) => {
  if (methods.length === 0) {
    return [];
  }

  const filteredMethods = methods.filter(
    (method, index, methodsArray) => index === methodsArray.findIndex((m) => m.name === method.name)
  );

  const paramsToMethodMap = methods.reduce((acc, currentVal) => {
    const { name, parameters, return: returnValue } = currentVal;
    const hasParameters = parameters.length > 0;

    let methodName = name;

    if (reservedWords.includes(name)) {
      methodName = `${name}MethodName`;
    }

    if (acc[methodName] === undefined) {
      acc[methodName] = {
        parameters: hasParameters ? [parameters] : [],
        returnValues: returnValue ? [returnValue] : [],
      };
    } else {
      const hasIncomingParameters = acc[methodName].parameters.length > 0;
      const hasIncomingReturnValue = acc[methodName].returnValues.length > 0;

      if (hasParameters && hasIncomingParameters) {
        acc[methodName].parameters = [parameters, ...acc[methodName].parameters];
      } else {
        acc[methodName].parameters = [parameters];
      }

      if (returnValue && hasIncomingReturnValue) {
        acc[methodName].returnValues = [returnValue, ...acc[methodName].returnValues];
      } else {
        acc[methodName].returnValues = [returnValue];
      }
    }

    return acc;
  }, {});

  return filteredMethods.map((method) => {
    const methodName = reservedWords.includes(method.name)
      ? `${method.name}MethodName`
      : method.name;

    return {
      name: method.name,
      type: method.type,
      parameters: paramsToMethodMap[methodName].parameters || [],
      returnValues: paramsToMethodMap[methodName].returnValues || [],
    };
  });
};

/**
 * Given a class, we return its fields and methods
 *
 * @param {object} painlessClass
 * @returns {Array<PainlessCompletionItem>}
 */
const getPainlessClassToAutocomplete = (painlessClass) => {
  const { staticFields, fields, staticMethods, methods } = painlessClass;

  const staticFieldsAutocomplete = staticFields.map(({ name, type }) => {
    return {
      label: name,
      kind: 'property',
      documentation: `${name}: ${type}`,
      insertText: name,
    };
  });

  const fieldsAutocomplete = fields.map(({ name, type }) => {
    return {
      label: name,
      kind: 'property',
      documentation: `${name}: ${type}`,
      insertText: name,
    };
  });

  const staticMethodsAutocomplete = removeDuplicateMethods(staticMethods).map(
    ({ name, parameters, returnValues }) => {
      return {
        label: name,
        kind: 'method',
        documentation: getMethodDescription(name, parameters, returnValues),
        insertText: name,
      };
    }
  );

  const methodsAutocomplete = removeDuplicateMethods(methods).map(
    ({ name, parameters, returnValues }) => {
      return {
        label: name,
        kind: 'method',
        documentation: getMethodDescription(name, parameters, returnValues),
        insertText: name,
      };
    }
  );

  return [
    ...staticFieldsAutocomplete,
    ...staticMethodsAutocomplete,
    ...methodsAutocomplete,
    ...fieldsAutocomplete,
  ];
};

const getPainlessConstructorToAutocomplete = (constructors, imported) => {
  if (constructors.length) {
    // There are sometimes two constructor definitions if a parameter is accepted
    // We only care about getting the constructor name for now, so we can access the first one in the array
    const { declaring } = constructors[0];
    // The constructor name is sometimes prefixed by the Java package and needs to be removed
    const constructorName = getDisplayName(declaring, imported);

    return {
      label: constructorName,
      kind: 'constructor',
      documentation: `Constructor: ${constructorName}`,
      insertText: constructorName,
    };
  }

  return undefined;
};

/**
 * Given an array of classes from an ES context definition,
 * reformat the data in a way that can be more easily consumed by Monaco
 *
 * @param {Array} painlessClasses
 * @returns {Array<Suggestion>}
 */
const createAutocompleteDefinitions = (painlessClasses) => {
  const suggestions = painlessClasses.map(
    ({
      name,
      static_fields: staticFields,
      fields,
      static_methods: staticMethods,
      methods,
      constructors,
      imported,
    }) => {
      // The name is often prefixed by the Java package (e.g., Java.lang.Math) and needs to be removed
      const displayName = getDisplayName(name, imported);

      const properties = getPainlessClassToAutocomplete({
        staticFields,
        fields,
        staticMethods,
        methods,
      });

      const constructorDefinition = getPainlessConstructorToAutocomplete(constructors, imported);

      return {
        label: displayName,
        kind: 'class',
        documentation: `Class: ${displayName}`,
        insertText: displayName,
        properties: properties.length ? properties : undefined,
        constructorDefinition,
      };
    }
  );

  return suggestions;
};

module.exports = {
  getMethodDescription,
  getPainlessClassToAutocomplete,
  createAutocompleteDefinitions,
};
