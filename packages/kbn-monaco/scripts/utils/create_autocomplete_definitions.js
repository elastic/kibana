/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
 * Filters the context data by primitives and returns an array of primitive names
 * The current data structure from ES does not indicate if a field is
 * a primitive or class, so we infer this by checking
 * that no methods or fields are defined
 * @param {string} contextData
 * @returns {Array<String>}
 */
const getPrimitives = (contextData) => {
  return contextData
    .filter(
      ({
        static_fields: staticFields,
        fields,
        static_methods: staticMethods,
        methods,
        constructors,
      }) => {
        if (
          staticMethods.length === 0 &&
          methods.length === 0 &&
          staticFields.length === 0 &&
          fields.length === 0 &&
          constructors.length === 0
        ) {
          return true;
        }
      }
    )
    .map((type) => type.name);
};

/**
 * Given the method name, array of parameters, and return value,
 * we create a description of the method that will be
 * used to display the help tooltip for the autocomplete suggestion
 *
 * Example of final format: pow(double a, double b): double
 *
 * Some methods support different parameter types, so this is also supported
 * and represented by the "|" character
 *
 * Example: Long.parseLong(String a, int b | String a): long
 *
 * @param {string} methodName
 * @param {Array<Array<String>>} parameters
 * @param {string} returnValue
 * @returns {string}
 */
const getMethodDescription = (methodName, parameters, returnValue) => {
  const parametersDescription = parameters.reduce((paramsDescription, paramsArray, index) => {
    const isNotLast = parameters.length - 1 !== index;

    const parameterSetDescription = paramsArray.reduce(
      (description, parameterType, paramsArrayIndex) => {
        const newParameterDescription = `${parameterType} ${parameterIndexToLetterMap[paramsArrayIndex]}`;
        const isLastParameter = paramsArray.length - 1 === paramsArrayIndex;

        description = `${description}${newParameterDescription}${isLastParameter ? '' : ', '}`;

        return isNotLast && isLastParameter ? `${description} | ` : description;
      },
      ''
    );

    paramsDescription = `${paramsDescription}${parameterSetDescription}`;

    return paramsDescription;
  }, '');

  return `${methodName}(${parametersDescription}): ${returnValue}`;
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
  let previousMethod;

  if (methods.length === 0) {
    return [];
  }

  const filteredMethods = methods.reduce((acc, currentVal) => {
    const { name } = currentVal;

    if (previousMethod === undefined || previousMethod !== name) {
      previousMethod = name;

      acc.push(currentVal);
    }
    return acc;
  }, []);

  const paramsToMethodMap = methods.reduce((acc, currentVal) => {
    const { name, parameters } = currentVal;
    const hasParameters = parameters.length > 0;
    const hasIncomingParameters = acc[name] && acc[name].length > 0;

    if (acc[name] === undefined) {
      acc[name] = hasParameters ? [parameters] : undefined;
    } else {
      if (hasParameters && hasIncomingParameters) {
        acc[name] = [parameters, ...acc[name]];
      } else {
        acc[name] = [parameters];
      }
    }

    return acc;
  }, {});

  return filteredMethods.map((method) => {
    return {
      ...method,
      parameters: paramsToMethodMap[method.name] || [],
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
    ({ name, parameters, return: returnValue }) => {
      return {
        label: name,
        kind: 'method',
        documentation: getMethodDescription(name, parameters, returnValue),
        insertText: name,
      };
    }
  );

  const methodsAutocomplete = removeDuplicateMethods(methods).map(
    ({ name, parameters, return: returnValue }) => {
      return {
        label: name,
        kind: 'method',
        documentation: getMethodDescription(name, parameters, returnValue),
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

const getPainlessConstructorToAutocomplete = (constructors) => {
  if (constructors.length) {
    // There are sometimes two constructor definitions if a parameter is accepted
    // We only care about getting the constructor name for now, so we can access the first one in the array
    const { declaring } = constructors[0];
    // The constructor name is sometimes prefixed by the Java package and needs to be removed
    const constructorName = declaring.split('.').pop() || declaring;

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
    }) => {
      // The name is often prefixed by the Java package (e.g., Java.lang.Math) and needs to be removed
      const displayName = name.split('.').pop() || name;
      const isType = getPrimitives(painlessClasses).includes(name);

      const properties = getPainlessClassToAutocomplete({
        staticFields,
        fields,
        staticMethods,
        methods,
      });

      const constructorDefinition = getPainlessConstructorToAutocomplete(constructors);

      return {
        label: displayName,
        kind: isType ? 'type' : 'class',
        documentation: isType ? `Primitive: ${displayName}` : `Class: ${displayName}`,
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
  getPrimitives,
  getPainlessClassToAutocomplete,
  createAutocompleteDefinitions,
};
